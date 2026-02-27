from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from app.core.deps import CurrentUser, DBDep
from app.core.config import settings
from app.models.interview import InterviewStatus
from app.services.storage import get_storage_backend

router = APIRouter(prefix="/interviews", tags=["Interviews"])


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
    except Exception as exc:
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

    return {"data": document}


@router.get("")
async def list_interviews(user: CurrentUser):
    return {"data": [], "meta": {"page": 1, "limit": 20, "total": 0, "pages": 0}}


@router.post("/batch-upload")
async def batch_upload(user: CurrentUser):
    return {"message": "batch-upload — Stage 2"}


@router.get("/metrics")
async def get_metrics(user: CurrentUser):
    return {"data": {}}


@router.get("/{interview_id}")
async def get_interview(interview_id: str, user: CurrentUser):
    return {"message": f"get {interview_id} — Stage 2"}


@router.patch("/{interview_id}")
async def update_interview(interview_id: str, user: CurrentUser):
    return {"message": f"update {interview_id} — Stage 2"}


@router.delete("/{interview_id}")
async def delete_interview(interview_id: str, user: CurrentUser):
    return {"message": f"delete {interview_id} — Stage 2"}


@router.post("/{interview_id}/transcribe")
async def transcribe_interview(interview_id: str, user: CurrentUser):
    return {"message": f"transcribe {interview_id} — Stage 4"}


@router.post("/{interview_id}/analyse")
async def analyse_interview(interview_id: str, user: CurrentUser):
    return {"message": f"analyse {interview_id} — Stage 5"}


@router.get("/{interview_id}/status")
async def get_status(interview_id: str, user: CurrentUser):
    return {"data": {"id": interview_id, "status": "unknown"}}


@router.get("/{interview_id}/export")
async def export_transcript(interview_id: str, user: CurrentUser, format: str = "txt"):
    return {"message": f"export {interview_id} as {format} — Stage 7"}
