from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class InterviewStatus(str, Enum):
    uploaded     = "uploaded"
    queued       = "queued"
    transcribing = "transcribing"
    analysing    = "analysing"
    completed    = "completed"
    failed       = "failed"


class TranscriptWord(BaseModel):
    text:       str
    start_ms:   int
    end_ms:     int
    confidence: float
    speaker:    str | None = None


class TranscriptUtterance(BaseModel):
    speaker:   str
    text:      str
    start_ms:  int
    end_ms:    int
    sentiment: str | None = None


class Transcript(BaseModel):
    text:          str
    words:         list[TranscriptWord] = []
    utterances:    list[TranscriptUtterance] = []
    language_code: str = "en"
    confidence:    float = 0.0


class SentimentBySpeaker(BaseModel):
    overall: str
    score:   float


class SentimentBreakdown(BaseModel):
    overall:    str
    score:      float
    notes:      str
    by_speaker: dict[str, SentimentBySpeaker] = {}


class Keyword(BaseModel):
    term:      str
    category:  str
    frequency: int


class QAPair(BaseModel):
    question:  str
    answer:    str
    speaker_q: str
    speaker_a: str


class AIAnalysis(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    summary:           str
    candidate_summary: str
    sentiment:         SentimentBreakdown
    keywords:          list[Keyword] = []
    questions_answers: list[QAPair] = []
    strengths:         list[str] = []
    red_flags:         list[str] = []
    model_used:        str
    prompt_tokens:     int
    completion_tokens: int
    analysed_at:       datetime


class InterviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:               str = Field(alias="_id")
    user_id:          str
    title:            str
    original_name:    str
    filename:         str
    file_size:        int
    file_type:        str
    storage_key:      str
    duration_seconds: float | None = None
    status:           InterviewStatus
    error_message:    str | None = None
    deepgram_job_id:  str | None = None
    template_id:      str | None = None
    transcript:       Transcript | None = None
    ai_analysis:      AIAnalysis | None = None
    tags:             list[str] = []
    created_at:       datetime
    updated_at:       datetime

    @field_validator("id", "user_id", "template_id", mode="before")
    @classmethod
    def stringify_objectid(cls, v: Any) -> str | None:
        if v is None:
            return None
        return str(v)


class InterviewSummaryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:                str = Field(alias="_id")
    user_id:           str
    title:             str
    original_name:     str
    file_size:         int
    file_type:         str
    duration_seconds:  float | None = None
    status:            InterviewStatus
    template_id:       str | None = None
    tags:              list[str] = []
    sentiment_overall: str | None = None
    created_at:        datetime
    updated_at:        datetime

    @field_validator("id", "user_id", "template_id", mode="before")
    @classmethod
    def stringify_objectid(cls, v: Any) -> str | None:
        if v is None:
            return None
        return str(v)


class UpdateInterviewRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    tags:  list[str] | None = None