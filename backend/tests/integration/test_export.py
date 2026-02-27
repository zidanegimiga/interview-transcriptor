import pytest
from unittest.mock import AsyncMock
from bson import ObjectId

MOCK_ID = str(ObjectId())

MOCK_INTERVIEW_WITH_TRANSCRIPT = {
    "_id": ObjectId(MOCK_ID),
    "user_id": "test-user-id",
    "title": "Test Interview",
    "transcript": {
        "text": "Interviewer: Tell me about yourself. Candidate: I have five years of experience.",
        "utterances": [
            {"speaker": "A", "text": "Tell me about yourself.", "start_ms": 0, "end_ms": 2000},
            {"speaker": "B", "text": "I have five years of experience.", "start_ms": 2500, "end_ms": 5000},
        ],
    },
    "ai_analysis": None,
    "status": "completed",
}

MOCK_INTERVIEW_NO_TRANSCRIPT = {
    "_id": ObjectId(MOCK_ID),
    "user_id": "test-user-id",
    "title": "Test Interview",
    "transcript": None,
    "status": "uploaded",
}


@pytest.mark.asyncio
async def test_export_requires_auth(client):
    response = await client.get(f"/api/v1/interviews/{MOCK_ID}/export")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_export_returns_404_for_unknown_interview(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(return_value=None)
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_export_returns_400_when_no_transcript(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=MOCK_INTERVIEW_NO_TRANSCRIPT
    )
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export",
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_export_txt_returns_plain_text(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=MOCK_INTERVIEW_WITH_TRANSCRIPT
    )
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export?format=txt",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert "Speaker A" in response.text
    assert "Speaker B" in response.text


@pytest.mark.asyncio
async def test_export_pdf_returns_pdf_bytes(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=MOCK_INTERVIEW_WITH_TRANSCRIPT
    )
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export?format=pdf",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_export_docx_returns_docx_bytes(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=MOCK_INTERVIEW_WITH_TRANSCRIPT
    )
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export?format=docx",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "wordprocessingml" in response.headers["content-type"]
    # docx files are zip archives, check magic bytes
    assert response.content[:2] == b"PK"


@pytest.mark.asyncio
async def test_export_returns_400_for_invalid_format(client, auth_headers, mock_db):
    mock_db["interviews"].find_one = AsyncMock(
        return_value=MOCK_INTERVIEW_WITH_TRANSCRIPT
    )
    response = await client.get(
        f"/api/v1/interviews/{MOCK_ID}/export?format=xlsx",
        headers=auth_headers,
    )
    assert response.status_code == 400
