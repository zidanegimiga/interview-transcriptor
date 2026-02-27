import uuid
from typing import Protocol

import boto3
from botocore.config import Config

from app.core.config import settings


class StorageBackend(Protocol):
    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Upload a file and return the storage key."""
        ...

    async def delete(self, storage_key: str) -> None:
        """Delete a file by its storage key."""
        ...

    async def presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Return a temporary URL for direct download."""
        ...


class S3StorageBackend:
    """
    Works with Cloudflare R2, AWS S3, and MinIO — same boto3 SDK.
    The endpoint URL is what differentiates them.
    """
    # boto3 is the standard S3-compatible client.
    # Despite the AWS parameter names, this works with any S3-compatible
    # storage provider — in our case Cloudflare R2.

    def __init__(self):
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY, # R2 Access Key ID
            aws_secret_access_key=settings.S3_SECRET_KEY, # R2 Secret Access Key
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self._bucket = settings.S3_BUCKET_NAME

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        storage_key = f"interviews/{uuid.uuid4()}.{ext}"
        self._client.put_object(
            Bucket=self._bucket,
            Key=storage_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return storage_key

    async def delete(self, storage_key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=storage_key)

    async def presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": storage_key},
            ExpiresIn=expires_in,
        )


class MockStorageBackend:
    """Used in tests — no real network calls."""

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        return f"interviews/mock-{uuid.uuid4()}.mp3"

    async def delete(self, storage_key: str) -> None:
        pass

    async def presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        return f"http://mock-storage/{storage_key}"


def get_storage_backend() -> S3StorageBackend | MockStorageBackend:
    if settings.STORAGE_BACKEND == "mock":
        return MockStorageBackend()
    return S3StorageBackend()
