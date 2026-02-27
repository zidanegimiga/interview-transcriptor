from fastapi import APIRouter, Request

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/deepgram")
async def deepgram_webhook(request: Request):
    return {"received": True}
