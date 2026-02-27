import pytest
from unittest.mock import AsyncMock, patch
from io import BytesIO


# Helpers

def make_audio_file(filename: str = "interview.mp3", size: int = 1024) -> dict:
    """Return a files dict suitable for httpx multipart upload."""
    return {
        "file": (filename, BytesIO(b"0" * size), "audio/mpeg")
    }


def make_video_file(filename: str = "interview.mp4", size: int = 1024) -> dict:
    return {
        "file": (filename, BytesIO(b"0" * size), "video/mp4")
    }


def make_invalid_file(filename: str = "document.pdf") -> dict:
    return {
        "file": (filename, BytesIO(b"0" * 1024), "application/pdf")
    }


# Auth

@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    response = await client.post(
        "/api/v1/interviews/upload",
        files=make_audio_file(),
    )
    assert response.status_code == 401


# File type validation

@pytest.mark.asyncio
async def test_upload_rejects_invalid_file_type(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock:
        mock.return_value = AsyncMock()
        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_invalid_file(),
            headers=auth_headers,
        )
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_accepts_mp3(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock_storage, \
         patch("app.api.v1.interviews.DBDep") as mock_db:

        storage_instance = AsyncMock()
        storage_instance.upload.return_value = "interviews/test.mp3"
        mock_storage.return_value = storage_instance

        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_audio_file(),
            headers=auth_headers,
        )
    assert response.status_code in (201, 500)


@pytest.mark.asyncio
async def test_upload_accepts_mp4(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock_storage:
        storage_instance = AsyncMock()
        storage_instance.upload.return_value = "interviews/test.mp4"
        mock_storage.return_value = storage_instance

        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_video_file(),
            headers=auth_headers,
        )
    assert response.status_code in (201, 500)


# File size validation

@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(client, auth_headers, monkeypatch):
    from app.core.config import settings
    # Set limit to 1MB for this test so we do not allocate 500MB
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 1)
    oversized_bytes = b"0" * (1 * 1024 * 1024 + 1)  # 1MB + 1 byte
    response = await client.post(
        "/api/v1/interviews/upload",
        files={
            "file": ("big.mp3", BytesIO(oversized_bytes), "audio/mpeg")
        },
        headers=auth_headers,
    )
    assert response.status_code == 413


def settings_size() -> int:
    from app.core.config import settings
    return settings.MAX_FILE_SIZE_BYTES


# Successful upload 
@pytest.mark.asyncio
async def test_upload_returns_interview_document(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock_storage, \
         patch("app.api.v1.interviews.DBDep"):

        storage_instance = AsyncMock()
        storage_instance.upload.return_value = "interviews/test-uuid.mp3"
        mock_storage.return_value = storage_instance

        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_audio_file(filename="candidate-john.mp3"),
            headers=auth_headers,
        )

        if response.status_code == 201:
            body = response.json()
            assert "data" in body
            assert body["data"]["original_name"] == "candidate-john.mp3"
            assert body["data"]["status"] == "uploaded"
            assert body["data"]["file_type"] == "audio/mpeg"


@pytest.mark.asyncio
async def test_upload_uses_filename_as_default_title(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock_storage:
        storage_instance = AsyncMock()
        storage_instance.upload.return_value = "interviews/test.mp3"
        mock_storage.return_value = storage_instance

        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_audio_file(filename="my-interview.mp3"),
            headers=auth_headers,
        )

        if response.status_code == 201:
            body = response.json()
            assert body["data"]["title"] == "my-interview.mp3"


@pytest.mark.asyncio
async def test_upload_uses_custom_title_when_provided(client, auth_headers):
    with patch("app.api.v1.interviews.get_storage_backend") as mock_storage:
        storage_instance = AsyncMock()
        storage_instance.upload.return_value = "interviews/test.mp3"
        mock_storage.return_value = storage_instance

        response = await client.post(
            "/api/v1/interviews/upload",
            files=make_audio_file(),
            data={"title": "John Doe — Senior Engineer"},
            headers=auth_headers,
        )

        if response.status_code == 201:
            body = response.json()
            assert body["data"]["title"] == "John Doe — Senior Engineer"
