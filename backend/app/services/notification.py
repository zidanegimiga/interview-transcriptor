import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections keyed by user_id.
    One user can have multiple connections (multiple browser tabs).
    """

    def __init__(self):
        # user_id -> list of active WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info("WebSocket connected: user=%s, total_connections=%d",
                    user_id, len(self._connections[user_id]))

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self._connections:
            self._connections[user_id].discard(websocket) \
                if hasattr(self._connections[user_id], "discard") \
                else self._connections[user_id].remove(websocket) \
                if websocket in self._connections[user_id] else None
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info("WebSocket disconnected: user=%s", user_id)

    async def send_to_user(self, user_id: str, event: dict[str, Any]) -> None:
        """Send a JSON event to all connections for a given user."""
        connections = self._connections.get(user_id, [])
        if not connections:
            logger.debug("No active WebSocket for user=%s, event dropped: %s",
                         user_id, event.get("type"))
            return

        dead = []
        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)

        # Cleaning broken connections
        for ws in dead:
            self.disconnect(user_id, ws)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))


# imported by both websocket.py and webhooks.py util fns
manager = ConnectionManager()
