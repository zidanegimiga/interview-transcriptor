from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status

from app.core.deps import CurrentUser, DBDep
from app.core.config import settings
from app.models.common import ok, paginate
from app.models.interview import InterviewStatus, UpdateInterviewRequest
from app.services.storage import get_storage_backend

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialisation."""
    doc["_id"] = str(doc["_id"])
    doc["user_id"] = str(doc["user_id"])
    if doc.get("template_id"):
        doc["template_id"] = str(doc["template_id"])
    return doc


# Upload 

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_interview(
    user: CurrentUser,
    db: DBDep,
    file: UploadFile = File(...),
    title: str | None = Form(None),
):
    # Validate file type
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{file.content_type}' is not supported. "
                   f"Allowed types: {', '.join(settings.ALLOWED_MIME_TYPES)}",
        )

    # Read and validate file size
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB.",
        )

    # Upload to R2
    storage = get_storage_backend()
    try:
        storage_key = await storage.upload(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed. Please try again.",
        )

    # Create MongoDB document
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user["id"],
        "title": title or file.filename,
        "original_name": file.filename,
        "filename": storage_key.split("/")[-1],
        "file_size": len(file_bytes),
        "file_type": file.content_type,
        "storage_key": storage_key,
        "duration_seconds": None,
        "status": InterviewStatus.uploaded.value,
        "error_message": None,
        "deepgram_job_id": None,
        "template_id": None,
        "transcript": None,
        "ai_analysis": None,
        "tags": [],
        "notifications": [],
        "created_at": now,
        "updated_at": now,
    }

    result = await db["interviews"].insert_one(document)
    document["_id"] = str(result.inserted_id)
    document["user_id"] = str(document["user_id"])

    return ok(document)


# List 

@router.get("")
async def list_interviews(
    user: CurrentUser,
    db: DBDep,
    page: int = 1,
    limit: int = 20,
    interview_status: str | None = None,
    search: str | None = None,
):
    query: dict = {"user_id": user["id"]}
    if interview_status:
        query["status"] = interview_status
    if search:
        query["$text"] = {"$search": search}

    skip = (page - 1) * limit
    total = await db["interviews"].count_documents(query)
    cursor = db["interviews"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return ok([_serialize(d) for d in docs], paginate(page, limit, total))


# Metrics
@router.get("/metrics")
async def get_metrics(user: CurrentUser, db: DBDep):
    status_pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts = await db["interviews"].aggregate(status_pipeline).to_list(length=20)

    sentiment_pipeline = [
        {"$match": {"user_id": user["id"], "ai_analysis": {"$ne": None}}},
        {"$group": {"_id": "$ai_analysis.sentiment.overall", "count": {"$sum": 1}}},
    ]
    sentiment_counts = await db["interviews"].aggregate(sentiment_pipeline).to_list(length=10)

    keyword_pipeline = [
        {"$match": {"user_id": user["id"], "ai_analysis.keywords": {"$exists": True}}},
        {"$unwind": "$ai_analysis.keywords"},
        {"$group": {"_id": "$ai_analysis.keywords.term", "count": {"$sum": "$ai_analysis.keywords.frequency"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_keywords = await db["interviews"].aggregate(keyword_pipeline).to_list(length=10)

    return ok({
        "by_status": {s["_id"]: s["count"] for s in status_counts},
        "by_sentiment": {s["_id"]: s["count"] for s in sentiment_counts},
        "top_keywords": [{"term": k["_id"], "count": k["count"]} for k in top_keywords],
    })


# Get one 

@router.get("/{interview_id}")
async def get_interview(interview_id: str, user: CurrentUser, db: DBDep):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db["interviews"].find_one({"_id": oid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")

    return ok(_serialize(doc))


# Update
async def update_interview(
    interview_id: str,
    payload: UpdateInterviewRequest,
    user: CurrentUser,
    db: DBDep,
):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")
    updates["updated_at"] = datetime.now(timezone.utc)

    result = await db["interviews"].update_one(
        {"_id": oid, "user_id": user["id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found.")

    doc = await db["interviews"].find_one({"_id": oid})
    return ok(_serialize(doc))


# Delete 

@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(interview_id: str, user: CurrentUser, db: DBDep):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    result = await db["interviews"].delete_one({"_id": oid, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found.")


# Status 
@router.get("/{interview_id}/status")
async def get_status(interview_id: str, user: CurrentUser, db: DBDep):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db["interviews"].find_one(
        {"_id": oid, "user_id": user["id"]},
        {"status": 1, "error_message": 1, "updated_at": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")

    return ok({
        "id": interview_id,
        "status": doc["status"],
        "error_message": doc.get("error_message"),
        "updated_at": doc["updated_at"].isoformat(),
    })


# Transcribe
@router.post("/{interview_id}/transcribe")
async def transcribe_interview(interview_id: str, user: CurrentUser, db: DBDep):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db["interviews"].find_one({"_id": oid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")

    # Idempotency: not resubmitting if already transcribing or done
    if doc.get("status") in ("transcribing", "analysing", "completed"):
        return ok({"id": interview_id, "message": "Already transcribed or in progress."})

    from app.services.transcription import get_transcription_service
    from datetime import datetime, timezone

    service = get_transcription_service()
    try:
        job_id = await service.submit(
            storage_key=doc["storage_key"],
            interview_id=interview_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription submission failed: {str(exc)}")

    await db["interviews"].update_one(
        {"_id": oid},
        {"$set": {
            "status":          "queued",
            "deepgram_job_id": job_id,
            "updated_at":      datetime.now(timezone.utc),
        }}
    )

    return ok({"id": interview_id, "status": "queued", "job_id": job_id})


# Analyse
@router.post("/{interview_id}/analyse")
async def analyse_interview(interview_id: str, user: CurrentUser, db: DBDep):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db["interviews"].find_one({"_id": oid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")

    if doc.get("ai_analysis"):
        return ok({"id": interview_id, "message": "Already analysed."})

    if not doc.get("transcript"):
        raise HTTPException(
            status_code=400,
            detail="Transcript not available. Run transcription first."
        )

    # update status to analysing
    from datetime import datetime, timezone
    await db["interviews"].update_one(
        {"_id": oid},
        {"$set": {"status": "analysing", "updated_at": datetime.now(timezone.utc)}}
    )

    # kick off analysis as background task
    import asyncio
    from app.services.analysis import run_analysis
    asyncio.create_task(run_analysis(interview_id, user["id"]))

    return ok({"id": interview_id, "message": "Analysis started."})


# Export

@router.get("/{interview_id}/export")
async def export_transcript(
    interview_id: str,
    user: CurrentUser,
    db: DBDep,
    format: str = "txt",
):
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db["interviews"].find_one({"_id": oid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")

    return ok({"id": interview_id, "format": format, "message": "Export coming in Stage 7."})


# Batch upload 

@router.post("/batch-upload")
async def batch_upload(user: CurrentUser, db: DBDep):
    return ok({"message": "Batch upload coming in Stage 7."})