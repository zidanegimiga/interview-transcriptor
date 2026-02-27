import logging
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


# Protocol (interface) 

class TranscriptionService(Protocol):
    async def submit(
        self,
        storage_key: str,
        interview_id: str,
    ) -> str:
        """Submit a file for transcription. Returns a job ID."""
        ...

    async def parse_webhook(self, payload: dict) -> dict:
        """
        Parse a raw webhook payload into our internal transcript shape.
        Returns a dict matching the Transcript model.
        """
        ...





