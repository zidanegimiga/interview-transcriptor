import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.services.notification import manager

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time status updates.
    Authentication: JWT passed as ?token=<jwt> query parameter.
    """
    # Authenticate via query param token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token.")
        return

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        token_user_id = payload.get("id") or payload.get("sub")
        if not token_user_id or token_user_id != user_id:
            await websocket.close(code=4001, reason="Invalid token.")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token.")
        return

    await manager.connect(user_id, websocket)
    try:
        await manager.send_to_user(user_id, {
            "type": "notification",
            "level": "info",
            "message": "Connected to real-time updates.",
        })

        # Keep connection alive, and listen for disconnect or ping
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        logger.info("WebSocket client disconnected: user=%s", user_id)
