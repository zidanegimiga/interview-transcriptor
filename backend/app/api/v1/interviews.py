from fastapi import APIRouter

from app.core.deps import CurrentUser

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.get("")
async def list_interviews(user: CurrentUser):
    return {"data": [], "meta": {"page": 1, "limit": 20, "total": 0, "pages": 0}}


@router.post("/upload")
async def upload_interview(user: CurrentUser):
    return {"message": "upload — Stage 2"}


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
