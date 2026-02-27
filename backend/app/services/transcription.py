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



# Mock implementation for testing

class MockTranscriptionService:
    """Returns realistic fake data — no real API calls."""

    async def submit(self, storage_key: str, interview_id: str) -> str:
        logger.info("Mock transcription submitted for interview %s", interview_id)
        return f"mock-job-{interview_id}"

    async def parse_webhook(self, payload: dict) -> dict:
        return {
            "transcript": {
                "text": "Interviewer: Tell me about yourself. Candidate: I have five years of Python experience.",
                "words": [
                    {"text": "Tell", "start_ms": 0, "end_ms": 500, "confidence": 0.99, "speaker": "A"},
                    {"text": "me", "start_ms": 500, "end_ms": 700, "confidence": 0.99, "speaker": "A"},
                ],
                "utterances": [
                    {"speaker": "A", "text": "Tell me about yourself.", "start_ms": 0, "end_ms": 2000, "sentiment": "neutral"},
                    {"speaker": "B", "text": "I have five years of Python experience.", "start_ms": 2500, "end_ms": 6000, "sentiment": "positive"},
                ],
                "language_code": "en",
                "confidence": 0.97,
            },
            "duration_seconds": 6.0,
        }


# Factory 

def get_transcription_service() -> DeepgramService | MockTranscriptionService:
    if settings.TRANSCRIPTION_BACKEND == "mock":
        return MockTranscriptionService()
    return DeepgramService()


# Helper functions
def _speaker_label(speaker_int) -> str:
    """Convert Deepgram's integer speaker index to 'A', 'B', 'C' etc."""
    if speaker_int is None:
        return "A"
    labels = "ABCDEFGHIJ"
    idx = int(speaker_int)

    return labels[idx] if idx < len(labels) else str(idx)


def _parse_sentiment(sentiment_data) -> str | None:
    """Extract sentiment label from Deepgram's sentiment object."""
    if not sentiment_data:
        return None
    if isinstance(sentiment_data, str):
        return sentiment_data
    # DGram returns {"sentiment": "positive", "sentiment_score": 0.8}
    return sentiment_data.get("sentiment")





