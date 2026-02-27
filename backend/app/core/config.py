from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    ALLOWED_MIME_TYPES: list[str] = [
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/x-wav",
        "audio/webm",
        "audio/ogg",
        "video/mp4",
        "video/quicktime",
        "video/webm",
    ]

    ENVIRONMENT: Literal["development", "production", "test"] = "development"

    MONGODB_URL: str = ""
    MONGODB_DB_NAME: str = "hr_interviews"

    STORAGE_BACKEND: Literal["s3", "mock"] = "s3"
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "auto"

    DEEPGRAM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    TRANSCRIPTION_BACKEND: Literal["deepgram", "mock"] = "deepgram"
    DEEPGRAM_WEBHOOK_SECRET: str = ""

    AUTH_SECRET: str = ""

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@hr-platform.com"
    EMAIL_PROVIDER: Literal["resend", "mock"] = "resend"

    FRONTEND_URL: str = "http://localhost:3000"

    MAX_FILE_SIZE_MB: int = 500
    MAX_BATCH_FILES: int = 10

    @property
    def CORS_ORIGINS(self) -> list[str]:
        origins = [self.FRONTEND_URL]
        if self.ENVIRONMENT == "development":
            origins += ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(set(origins))

    @property
    def MAX_FILE_SIZE_BYTES(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()