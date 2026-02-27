from fastapi import APIRouter, WebSocket

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    await websocket.send_json({"type": "notification", "message": "connected — Stage 4"})
    await websocket.close()
