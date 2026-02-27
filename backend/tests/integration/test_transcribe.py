import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId


MOCK_INTERVIEW_ID = str(ObjectId())


def make_interview(status="uploaded", has_transcript=False):
    return {
        "_id": ObjectId(MOCK_INTERVIEW_ID),
        "user_id": "test-user-id",
        "title": "Test Interview",
        "storage_key": "interviews/test.mp3",
        "status": status,
        "transcript": {"text": "Hello"} if has_transcript else None,
        "ai_analysis": None,
        "deepgram_job_id": None,
    }


# Auth

@pytest.mark.asyncio
async def test_transcribe_requires_auth(client):
    response = await client.post(f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe")
    assert response.status_code == 401


# Not found 

@pytest.mark.asyncio
async def test_transcribe_returns_404_for_unknown_interview(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(return_value=None)
    response = await client.post(
        f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
        headers=auth_headers,
    )
    assert response.status_code == 404


# Invalid ID

@pytest.mark.asyncio
async def test_transcribe_returns_400_for_invalid_id(client, auth_headers):
    response = await client.post(
        "/api/v1/interviews/not-a-valid-id/transcribe",
        headers=auth_headers,
    )
    assert response.status_code == 400


# Idempotency

@pytest.mark.asyncio
async def test_transcribe_is_idempotent_when_already_transcribing(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=make_interview(status="transcribing")
    )
    response = await client.post(
        f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert "Already" in body["data"]["message"]


@pytest.mark.asyncio
async def test_transcribe_is_idempotent_when_completed(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=make_interview(status="completed")
    )
    response = await client.post(
        f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert "Already" in body["data"]["message"]


# Successful submission

@pytest.mark.asyncio
async def test_transcribe_submits_job_and_returns_queued(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=make_interview(status="uploaded")
    )
    mock_db["interviews"].update_one = AsyncMock()

    with patch("app.api.v1.interviews.get_transcription_service") as mock_svc:
        service = AsyncMock()
        service.submit = AsyncMock(return_value="mock-job-id-123")
        mock_svc.return_value = service

        response = await client.post(
            f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
            headers=auth_headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["status"] == "queued"
    assert body["data"]["job_id"] == "mock-job-id-123"


@pytest.mark.asyncio
async def test_transcribe_updates_status_to_queued_in_db(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=make_interview(status="uploaded")
    )
    mock_db["interviews"].update_one = AsyncMock()

    with patch("app.api.v1.interviews.get_transcription_service") as mock_svc:
        service = AsyncMock()
        service.submit = AsyncMock(return_value="mock-job-id-456")
        mock_svc.return_value = service

        await client.post(
            f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
            headers=auth_headers,
        )

    mock_db["interviews"].update_one.assert_called_once()
    call_args = mock_db["interviews"].update_one.call_args
    set_data = call_args[0][1]["$set"]
    assert set_data["status"] == "queued"
    assert set_data["deepgram_job_id"] == "mock-job-id-456"


# Service failure

@pytest.mark.asyncio
async def test_transcribe_returns_500_when_service_fails(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=make_interview(status="uploaded")
    )

    with patch("app.api.v1.interviews.get_transcription_service") as mock_svc:
        service = AsyncMock()
        service.submit = AsyncMock(side_effect=Exception("Deepgram unreachable"))
        mock_svc.return_value = service

        response = await client.post(
            f"/api/v1/interviews/{MOCK_INTERVIEW_ID}/transcribe",
            headers=auth_headers,
        )

    assert response.status_code == 500
