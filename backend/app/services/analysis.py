import asyncio
import json
import logging
from datetime import datetime, timezone

from bson import ObjectId
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import get_db
from app.services.notification import manager

logger = logging.getLogger(__name__)

# GPT Prompt

SYSTEM_PROMPT = """You are an expert HR analyst. You will be given an interview transcript with speaker labels (Speaker A, Speaker B etc).
Analyse it thoroughly and return ONLY a valid JSON object matching the schema below.
Do not include any text outside the JSON. Do not use markdown code fences.

Return this exact JSON structure:
{
  "summary": "2-4 paragraph overview of the full interview conversation",
  "candidate_summary": "1 paragraph HR-focused assessment of the candidate",
  "sentiment": {
    "overall": "positive|neutral|negative|mixed",
    "score": 0.0,
    "notes": "brief explanation of the sentiment assignment",
    "by_speaker": {
      "A": {"overall": "positive|neutral|negative|mixed", "score": 0.0},
      "B": {"overall": "positive|neutral|negative|mixed", "score": 0.0}
    }
  },
  "keywords": [
    {"term": "Python", "category": "technology", "frequency": 3}
  ],
  "questions_answers": [
    {"question": "...", "answer": "...", "speaker_q": "A", "speaker_a": "B"}
  ],
  "strengths": ["strength one", "strength two"],
  "red_flags": ["concern one"]
}

Rules:
- score is a float from -1.0 (very negative) to 1.0 (very positive)
- category must be one of: skill | technology | competency | tool | soft_skill | other
- keywords should include all notable terms mentioned with their frequency in the transcript
- questions_answers should capture every clear question and its answer
- strengths and red_flags are from the HR perspective assessing the candidate
- if a field has no data return an empty array [] not null"""


def _build_prompt(transcript_text: str, template_prompt: str | None = None) -> str:
    base = f"Please analyse the following interview transcript:\n\n{transcript_text}"
    if template_prompt:
        base = f"Additional focus instructions:\n{template_prompt}\n\n{base}"
    return base


def _truncate_transcript(text: str, max_chars: int = 80000) -> str:
    """
    If transcript exceeds max_chars, keep the first 60% and last 40%.
    This preserves the opening (introductions) and closing (wrap-up).
    """
    if len(text) <= max_chars:
        return text
    keep_start = int(max_chars * 0.6)
    keep_end = max_chars - keep_start
    truncation_notice = "\n\n[...transcript truncated for length...]\n\n"
    return text[:keep_start] + truncation_notice + text[-keep_end:]


# Mock analysis data

MOCK_ANALYSIS = {
    "summary": (
        "The interview was conducted between an HR manager and a software engineering candidate "
        "with five years of Python experience. The conversation covered technical skills, "
        "past projects, and team collaboration.\n\n"
        "The candidate demonstrated strong knowledge of Python, FastAPI, and cloud infrastructure. "
        "They described a successful project migrating a monolith to microservices, resulting in "
        "a 40% reduction in latency.\n\n"
        "Cultural fit questions revealed a collaborative work style and strong communication skills. "
        "The candidate expressed genuine enthusiasm for the role and the company's mission."
    ),
    "candidate_summary": (
        "Strong technical candidate with solid Python fundamentals and practical experience "
        "in production systems. Demonstrates clear communication, ownership mentality, and "
        "enthusiasm. Recommended for a second round technical interview."
    ),
    "sentiment": {
        "overall": "positive",
        "score": 0.72,
        "notes": "Candidate was confident and engaged throughout. Interviewer tone was warm and encouraging.",
        "by_speaker": {
            "A": {"overall": "neutral",  "score": 0.15},
            "B": {"overall": "positive", "score": 0.82},
        },
    },
    "keywords": [
        {"term": "Python",        "category": "technology",  "frequency": 8},
        {"term": "FastAPI",       "category": "technology",  "frequency": 5},
        {"term": "microservices", "category": "technology",  "frequency": 4},
        {"term": "PostgreSQL",    "category": "technology",  "frequency": 3},
        {"term": "leadership",    "category": "soft_skill",  "frequency": 3},
        {"term": "Docker",        "category": "tool",        "frequency": 3},
        {"term": "problem solving","category": "competency", "frequency": 2},
        {"term": "communication", "category": "soft_skill",  "frequency": 2},
        {"term": "AWS",           "category": "technology",  "frequency": 2},
        {"term": "REST APIs",     "category": "skill",       "frequency": 2},
    ],
    "questions_answers": [
        {
            "question": "Can you tell me about yourself and your background?",
            "answer":   "I have five years of Python experience, mostly in backend development. I've worked at two startups building APIs and data pipelines.",
            "speaker_q": "A",
            "speaker_a": "B",
        },
        {
            "question": "What is your biggest technical achievement?",
            "answer":   "Migrating a monolithic Django app to microservices using FastAPI, which reduced latency by 40% and improved team velocity.",
            "speaker_q": "A",
            "speaker_a": "B",
        },
        {
            "question": "How do you handle disagreements with teammates?",
            "answer":   "I prefer to address it directly and early. I schedule a quick call to understand their perspective before escalating.",
            "speaker_q": "A",
            "speaker_a": "B",
        },
        {
            "question": "Where do you see yourself in five years?",
            "answer":   "I'd like to move into a technical lead role, mentoring junior developers while still staying hands-on with architecture.",
            "speaker_q": "A",
            "speaker_a": "B",
        },
    ],
    "strengths": [
        "Strong Python and backend engineering fundamentals",
        "Clear and confident communicator",
        "Demonstrated ownership — led migration project end to end",
        "Growth mindset — actively learning Rust and Go",
        "Practical experience with cloud infrastructure (AWS, Docker)",
    ],
    "red_flags": [
        "Limited experience with large enterprise codebases",
        "No formal experience managing direct reports yet",
    ],
}


# OpenAI analysis
async def _run_openai_analysis(transcript_text: str, template_prompt: str | None) -> tuple[dict, int, int]:
    """Returns (parsed_result, prompt_tokens, completion_tokens)."""
    user_message = _build_prompt(transcript_text, template_prompt)
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    return parsed, response.usage.prompt_tokens, response.usage.completion_tokens


async def _run_mock_analysis(transcript_text: str) -> tuple[dict, int, int]:
    """Returns mock data instantly — no API calls."""
    await asyncio.sleep(1)  # Simulate a small delay
    return MOCK_ANALYSIS, 0, 0


# Main analysis runner

async def run_analysis(interview_id: str, user_id: str | None) -> None:
    """
    Called by webhooks.py after transcription completes.
    Fetches the interview, calls GPT-4o-mini, saves result, notifies user.
    """
    db = get_db()

    try:
        oid = ObjectId(interview_id)
    except Exception:
        logger.error("run_analysis: invalid interview_id %s", interview_id)
        return

    interview = await db["interviews"].find_one({"_id": oid})
    if not interview:
        logger.error("run_analysis: interview not found %s", interview_id)
        return

    # Idempotency check — never re-analyse a completed interview
    if interview.get("ai_analysis"):
        logger.info("run_analysis: already analysed %s, skipping", interview_id)
        return

    transcript = interview.get("transcript")
    if not transcript or not transcript.get("text"):
        await _mark_failed(interview_id, "No transcript available for analysis.")
        return

    # Fetch template prompt if one was used
    template_prompt = None
    if interview.get("template_id"):
        try:
            template = await db["interview_templates"].find_one(
                {"_id": ObjectId(interview["template_id"])}
            )
            if template:
                template_prompt = template.get("prompt")
        except Exception:
            pass

    # Build prompt
    transcript_text = _truncate_transcript(transcript["text"])

    # Choose backend
    logger.info(
        "run_analysis: using %s backend for interview %s",
        settings.ANALYSIS_BACKEND,
        interview_id,
    )

    try:
        if settings.ANALYSIS_BACKEND == "mock":
            parsed, prompt_tokens, completion_tokens = await _run_mock_analysis(transcript_text)
        else:
            parsed, prompt_tokens, completion_tokens = await _run_openai_analysis(
                transcript_text, template_prompt
            )
    except Exception as exc:
        logger.exception("run_analysis: analysis failed: %s", exc)
        await _mark_failed(interview_id, f"AI analysis failed: {str(exc)}")
        if user_id:
            await manager.send_to_user(user_id, {
                "type":         "status_update",
                "interview_id": interview_id,
                "status":       "failed",
                "updated_at":   datetime.now(timezone.utc).isoformat(),
            })
        return

    # Build and save ai_analysis document
    now = datetime.now(timezone.utc)
    ai_analysis = {
        "summary":           parsed.get("summary", ""),
        "candidate_summary": parsed.get("candidate_summary", ""),
        "sentiment":         parsed.get("sentiment", {
            "overall": "neutral", "score": 0.0, "notes": "", "by_speaker": {}
        }),
        "keywords":          parsed.get("keywords", []),
        "questions_answers": parsed.get("questions_answers", []),
        "strengths":         parsed.get("strengths", []),
        "red_flags":         parsed.get("red_flags", []),
        "model_used":        f"{settings.ANALYSIS_BACKEND}:{settings.OPENAI_MODEL}",
        "prompt_tokens":     prompt_tokens,
        "completion_tokens": completion_tokens,
        "analysed_at":       now,
    }

    # Save to MongoDB
    await db["interviews"].update_one(
        {"_id": oid},
        {"$set": {
            "ai_analysis": ai_analysis,
            "status":      "completed",
            "updated_at":  now,
        }},
    )
    logger.info("run_analysis: completed for interview %s", interview_id)

    # Notify user via WebSocket
    if user_id:
        await manager.send_to_user(user_id, {
            "type":             "analysis_complete",
            "interview_id":     interview_id,
            "status":           "completed",
            "sentiment_overall": ai_analysis["sentiment"].get("overall"),
            "updated_at":       now.isoformat(),
        })


# Helpers

async def _mark_failed(interview_id: str, error: str) -> None:
    try:
        db = get_db()
        await db["interviews"].update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "status":        "failed",
                "error_message": error,
                "updated_at":    datetime.now(timezone.utc),
            }},
        )
    except Exception:
        pass