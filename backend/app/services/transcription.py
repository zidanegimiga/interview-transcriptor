import logging
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)



class TranscriptionService(Protocol):
    async def submit(self, storage_key: str, interview_id: str) -> str: ...
    async def parse_webhook(self, payload: dict) -> dict: ...



class DeepgramService:
    async def submit(self, storage_key: str, interview_id: str) -> str:
        """
        Generate a presigned R2 URL and submit it to Deepgram.
        Deepgram fetches the file directly — we never stream bytes through our server.
        Returns the Deepgram request_id (our job ID).
        """
        from deepgram import DeepgramClient, PrerecordedOptions, UrlSource
        from app.services.storage import get_storage_backend

        storage = get_storage_backend()
        presigned_url = await storage.presigned_url(storage_key, expires_in=3600)

        backend_url = getattr(settings, "BACKEND_URL", None) or "http://localhost:8000"
        if not backend_url.startswith("http"):
            backend_url = f"https://{backend_url}"
        webhook_url = f"{backend_url}/api/v1/webhooks/deepgram?interview_id={interview_id}"

        logger.info("Deepgram webhook callback URL: %s", webhook_url)

        client  = DeepgramClient(settings.DEEPGRAM_API_KEY)
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            diarize=True,
            utterances=True,
            punctuate=True,
            paragraphs=True,
        )

        source   = UrlSource(url=presigned_url)
        response = client.listen.rest.v("1").transcribe_url_callback(
            source,
            callback=webhook_url,
            options=options,
        )

        job_id = (
            getattr(response, "request_id", None)
            or f"job-{interview_id}"
        )

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

        return {
            "transcript": {
                "text":          text,
                "words":         words,
                "utterances":    parsed_utterances,
                "language_code": metadata.get("detected_language", "en"),
                "confidence":    confidence,
            },
            "duration_seconds": metadata.get("duration", 0),
        }



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
                    {"speaker": "A", "text": "Tell me about yourself.",               "start_ms": 0,    "end_ms": 2000, "sentiment": "neutral"},
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
