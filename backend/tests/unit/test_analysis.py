import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


def make_mock_interview(has_transcript=True, has_analysis=False, template_id=None):
    return {
        "_id": "mock-interview-id",
        "user_id": "test-user-id",
        "status": "analysing",
        "template_id": template_id,
        "transcript": {
            "text": "Interviewer: Tell me about yourself. Candidate: I have five years of Python experience.",
            "words": [],
            "utterances": [],
        } if has_transcript else None,
        "ai_analysis": {"summary": "existing"} if has_analysis else None,
    }


def make_mock_openai_response(content: dict):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps(content)
    mock_response.usage.prompt_tokens = 100
    mock_response.usage.completion_tokens = 200
    return mock_response


MOCK_GPT_RESULT = {
    "summary": "The interview covered Python experience and system design.",
    "candidate_summary": "Strong Python candidate with solid fundamentals.",
    "sentiment": {
        "overall": "positive",
        "score": 0.7,
        "notes": "Candidate was enthusiastic throughout.",
        "by_speaker": {
            "A": {"overall": "neutral", "score": 0.1},
            "B": {"overall": "positive", "score": 0.8},
        }
    },
    "keywords": [
        {"term": "Python", "category": "technology", "frequency": 3},
        {"term": "communication", "category": "soft_skill", "frequency": 2},
    ],
    "questions_answers": [
        {
            "question": "Tell me about yourself.",
            "answer": "I have five years of Python experience.",
            "speaker_q": "A",
            "speaker_a": "B",
        }
    ],
    "strengths": ["Strong Python skills", "Clear communicator"],
    "red_flags": [],
}


@pytest.mark.asyncio
async def test_run_analysis_completes_successfully():
    with patch("app.services.analysis.get_db") as mock_get_db, \
         patch("app.services.analysis.AsyncOpenAI") as mock_openai_cls, \
         patch("app.services.analysis.manager") as mock_manager:

        # Mock DB
        mock_db = MagicMock()
        mock_db["interviews"].find_one = AsyncMock(return_value=make_mock_interview())
        mock_db["interviews"].update_one = AsyncMock()
        mock_db["interview_templates"].find_one = AsyncMock(return_value=None)
        mock_get_db.return_value = mock_db

        # Mock OpenAI
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=make_mock_openai_response(MOCK_GPT_RESULT)
        )
        mock_openai_cls.return_value = mock_client

        # Mock WebSocket manager
        mock_manager.send_to_user = AsyncMock()

        from app.services.analysis import run_analysis
        await run_analysis("507f1f77bcf86cd799439011", "test-user-id")

        # DB was updated with completed status
        mock_db["interviews"].update_one.assert_called_once()
        call_args = mock_db["interviews"].update_one.call_args
        set_data = call_args[0][1]["$set"]
        assert set_data["status"] == "completed"
        assert set_data["ai_analysis"]["summary"] == MOCK_GPT_RESULT["summary"]
        assert set_data["ai_analysis"]["model_used"] == "gpt-4o-mini"

        # WebSocket notification was sent
        mock_manager.send_to_user.assert_called_once()
        event = mock_manager.send_to_user.call_args[0][1]
        assert event["type"] == "analysis_complete"
        assert event["status"] == "completed"


@pytest.mark.asyncio
async def test_run_analysis_skips_if_already_analysed():
    with patch("app.services.analysis.get_db") as mock_get_db, \
         patch("app.services.analysis.AsyncOpenAI") as mock_openai_cls:

        mock_db = MagicMock()
        mock_db["interviews"].find_one = AsyncMock(
            return_value=make_mock_interview(has_analysis=True)
        )
        mock_get_db.return_value = mock_db
        mock_openai_cls.return_value = AsyncMock()

        from app.services.analysis import run_analysis
        await run_analysis("507f1f77bcf86cd799439011", "test-user-id")

        # OpenAI should never be called
        mock_openai_cls.return_value.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_run_analysis_marks_failed_if_no_transcript():
    with patch("app.services.analysis.get_db") as mock_get_db, \
         patch("app.services.analysis.AsyncOpenAI") as mock_openai_cls:

        mock_db = MagicMock()
        mock_db["interviews"].find_one = AsyncMock(
            return_value=make_mock_interview(has_transcript=False)
        )
        mock_db["interviews"].update_one = AsyncMock()
        mock_get_db.return_value = mock_db

        from app.services.analysis import run_analysis
        await run_analysis("507f1f77bcf86cd799439011", "test-user-id")

        call_args = mock_db["interviews"].update_one.call_args
        set_data = call_args[0][1]["$set"]
        assert set_data["status"] == "failed"


@pytest.mark.asyncio
async def test_run_analysis_marks_failed_on_openai_error():
    with patch("app.services.analysis.get_db") as mock_get_db, \
         patch("app.services.analysis.AsyncOpenAI") as mock_openai_cls, \
         patch("app.services.analysis.manager") as mock_manager:

        mock_db = MagicMock()
        mock_db["interviews"].find_one = AsyncMock(return_value=make_mock_interview())
        mock_db["interviews"].update_one = AsyncMock()
        mock_get_db.return_value = mock_db

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("OpenAI rate limit")
        )
        mock_openai_cls.return_value = mock_client
        mock_manager.send_to_user = AsyncMock()

        from app.services.analysis import run_analysis
        await run_analysis("507f1f77bcf86cd799439011", "test-user-id")

        call_args = mock_db["interviews"].update_one.call_args
        set_data = call_args[0][1]["$set"]
        assert set_data["status"] == "failed"
        assert "AI analysis failed" in set_data["error_message"]


@pytest.mark.asyncio
async def test_truncate_transcript_leaves_short_transcripts_unchanged():
    from app.services.analysis import _truncate_transcript
    short = "Hello world"
    assert _truncate_transcript(short) == short


@pytest.mark.asyncio
async def test_truncate_transcript_shortens_long_transcripts():
    from app.services.analysis import _truncate_transcript
    long_text = "word " * 20000  # ~100,000 chars
    result = _truncate_transcript(long_text, max_chars=1000)
    assert len(result) <= 1100  # some slack for the truncation notice
    assert "truncated" in result
