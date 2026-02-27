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


# Deepgram implementation 

class DeepgramService:
    """
    Submits audio/video files to Deepgram Nova-3 for transcription.
    Uses URL-based submission pointing at the R2 presigned URL.
    Deepgram calls our webhook when done.
    """

    def __init__(self):
        from deepgram import DeepgramClient, PrerecordedOptions
        self._client = DeepgramClient(settings.DEEPGRAM_API_KEY)
        self._options = PrerecordedOptions(
            model="nova-3",
            smart_format=True,
            diarize=True,          # speaker A / speaker B
            utterances=True,       # sentence-level with speaker
            sentiment=True,        # per-utterance sentiment (free from Deepgram)
            punctuate=True,
            paragraphs=True,
        )

    async def submit(self, storage_key: str, interview_id: str) -> str:
        """
        Generate a presigned R2 URL and submit it to Deepgram.
        Deepgram fetches the file directly — we never stream bytes through our server.
        Returns the Deepgram request_id (our job ID).
        """
        from app.services.storage import get_storage_backend
        from deepgram import UrlSource, ListenWebhookOptions

        storage = get_storage_backend()
        presigned_url = await storage.presigned_url(storage_key, expires_in=3600)

        # Webhook URL — Deepgram will POST here when transcription is complete
        webhook_url = f"{settings.FRONTEND_URL.replace('3000', '8000')}/api/v1/webhooks/deepgram"
        # Note: in production this should be the Railway URL, not derived from FRONTEND_URL
        # We handle this properly via BACKEND_URL env var below
        callback_url = getattr(settings, "BACKEND_URL", None)
        if callback_url:
            webhook_url = f"{callback_url}/api/v1/webhooks/deepgram"

        response = await self._client.listen.asyncrest.v("1").transcribe_url(
            {"url": presigned_url},
            self._options,
            callback=webhook_url,
            callback_addons={"interview_id": interview_id},
        )

        job_id = response.request_id
        logger.info("Deepgram job submitted: %s for interview %s", job_id, interview_id)
        return job_id

    async def parse_webhook(self, payload: dict) -> dict:
        """
        Transform Deepgram's webhook payload into our Transcript shape.
        Deepgram sends: results.channels[0].alternatives[0] for words
        and results.utterances for speaker-level segments.
        """
        results = payload.get("results", {})
        channels = results.get("channels", [])
        utterances = results.get("utterances", [])
        metadata = payload.get("metadata", {})

        # Full transcript txt
        text = ""
        words = []
        confidence = 0.0

        if channels:
            alt = channels[0].get("alternatives", [{}])[0]
            text = alt.get("transcript", "")
            confidence = alt.get("confidence", 0.0)

            for w in alt.get("words", []):
                words.append({
                    "text":       w.get("punctuated_word", w.get("word", "")),
                    "start_ms":   int(w.get("start", 0) * 1000),
                    "end_ms":     int(w.get("end", 0) * 1000),
                    "confidence": w.get("confidence", 0.0),
                    "speaker":    _speaker_label(w.get("speaker")),
                })

        # Utterances: sentence-level with speaker + sentiment
        parsed_utterances = []
        for u in utterances:
            parsed_utterances.append({
                "speaker":   _speaker_label(u.get("speaker")),
                "text":      u.get("transcript", ""),
                "start_ms":  int(u.get("start", 0) * 1000),
                "end_ms":    int(u.get("end", 0) * 1000),
                "sentiment": _parse_sentiment(u.get("sentiment")),
            })

        duration = metadata.get("duration", 0)

        return {
            "transcript": {
                "text":          text,
                "words":         words,
                "utterances":    parsed_utterances,
                "language_code": metadata.get("detected_language", "en"),
                "confidence":    confidence,
            },
            "duration_seconds": duration,
        }





