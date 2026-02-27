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
    """Build the user message. Inject template instructions if provided."""
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

    # Fetch interview
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
            pass  # Template fetch failure is non-fatal

    # Build prompt
    transcript_text = _truncate_transcript(transcript["text"])
    user_message = _build_prompt(transcript_text, template_prompt)

    # Call GPT-4o-mini
    logger.info("run_analysis: calling GPT for interview %s", interview_id)
    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.2,  # using low temp for consistent structured output
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.exception("run_analysis: OpenAI call failed: %s", exc)
        await _mark_failed(interview_id, f"AI analysis failed: {str(exc)}")
        if user_id:
            await manager.send_to_user(user_id, {
                "type":         "status_update",
                "interview_id": interview_id,
                "status":       "failed",
                "updated_at":   datetime.now(timezone.utc).isoformat(),
            })
        return

    # Parse response
    raw_content = response.choices[0].message.content
    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        logger.error("run_analysis: JSON parse failed: %s\nContent: %s", exc, raw_content)
        await _mark_failed(interview_id, "AI returned invalid JSON.")
        return

    # Build ai_analysis document
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
        "model_used":        settings.OPENAI_MODEL,
        "prompt_tokens":     response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
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