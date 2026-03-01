import hashlib
import hmac
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.core.database import get_db
from app.services.notification import manager
from app.services.transcription import get_transcription_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)


@router.post("/deepgram", status_code=status.HTTP_200_OK)
async def deepgram_webhook(
    request: Request,
    interview_id: str | None = None,
    x_dg_signature: str | None = Header(None, alias="x-dg-signature"),
):
    """
    Receives Deepgram's completion callback.
    interview_id is passed as a query parameter in the callback URL.
    1. Validates HMAC signature
    2. Parses transcript
    3. Saves to MongoDB
    4. Pushes WebSocket event to the user
    5. Triggers AI analysis
    """
    raw_body = await request.body()

    # Validate HMAC signature
    if settings.DEEPGRAM_WEBHOOK_SECRET and x_dg_signature:
        expected = hmac.new(
            settings.DEEPGRAM_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_dg_signature):
            logger.warning("Deepgram webhook signature mismatch")
            raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    if not interview_id:
        logger.warning("Deepgram webhook missing interview_id query param")
        return {"received": True}

    payload = await request.json()

    # Parse the transcript
    service = get_transcription_service()
    try:
        parsed = await service.parse_webhook(payload)
    except Exception as exc:
        logger.exception("Failed to parse Deepgram webhook: %s", exc)
        await _mark_failed(interview_id, "Failed to parse transcription result.")
        return {"received": True}

    # Save transcript to MongoDB
    db = get_db()
    now = datetime.now(timezone.utc)
    try:
        oid = ObjectId(interview_id)
    except Exception:
        logger.warning("Invalid interview_id in webhook: %s", interview_id)
        return {"received": True}

    await db["interviews"].update_one(
        {"_id": oid},
        {"$set": {
            "transcript":       parsed["transcript"],
            "duration_seconds": parsed.get("duration_seconds"),
            "status":           "analysing",
            "updated_at":       now,
        }},
    )
    logger.info("Transcript saved for interview %s, triggering analysis", interview_id)

    # Notify user via WebSocket
    interview = await db["interviews"].find_one({"_id": oid}, {"user_id": 1})
    user_id = str(interview["user_id"]) if interview else None

    if user_id:
        await manager.send_to_user(user_id, {
            "type":         "status_update",
            "interview_id": interview_id,
            "status":       "analysing",
            "updated_at":   now.isoformat(),
        })

    # Trigger AI analysis
    # importing here to avoid circular imports
    from app.services.analysis import run_analysis
    import asyncio
    asyncio.create_task(run_analysis(interview_id, user_id))

    return {"received": True}


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

