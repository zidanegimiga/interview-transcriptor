import pytest
from jose import jwt


# Health check is public

@pytest.mark.asyncio
async def test_health_check_requires_no_auth(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


# Protected routes reject unauthenticated requests

@pytest.mark.asyncio
async def test_list_interviews_requires_auth(client):
    response = await client.get("/api/v1/interviews")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_interview_requires_auth(client):
    response = await client.get("/api/v1/interviews/some-id")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    response = await client.post("/api/v1/interviews/upload")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_templates_requires_auth(client):
    response = await client.get("/api/v1/templates")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_metrics_requires_auth(client):
    response = await client.get("/api/v1/interviews/metrics")
    assert response.status_code == 401


# Valid token grants access

@pytest.mark.asyncio
async def test_valid_token_accesses_interviews(client, auth_headers):
    response = await client.get("/api/v1/interviews", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_valid_token_accesses_templates(client, auth_headers):
    response = await client.get("/api/v1/templates", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_valid_token_accesses_metrics(client, auth_headers):
    response = await client.get("/api/v1/interviews/metrics", headers=auth_headers)
    assert response.status_code == 200


# Invalid tokens are rejected

@pytest.mark.asyncio
async def test_malformed_token_is_rejected(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    response = await client.get("/api/v1/interviews", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_signed_with_wrong_secret_is_rejected(client):
    bad_token = jwt.encode(
        {"id": "user-id", "email": "test@example.com", "role": "hr_manager"},
        "wrong-secret",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {bad_token}"}
    response = await client.get("/api/v1/interviews", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_missing_user_id_is_rejected(client):
    bad_token = jwt.encode(
        {"email": "test@example.com", "role": "hr_manager"},
        "test-secret",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {bad_token}"}
    response = await client.get("/api/v1/interviews", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_empty_authorization_header_is_rejected(client):
    headers = {"Authorization": "Bearer "}
    response = await client.get("/api/v1/interviews", headers=headers)
    assert response.status_code == 401


# Role information is carried in the token

@pytest.mark.asyncio
async def test_admin_token_grants_access(client, admin_headers):
    response = await client.get("/api/v1/interviews", headers=admin_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_viewer_token_grants_access(client, viewer_headers):
    response = await client.get("/api/v1/interviews", headers=viewer_headers)
    assert response.status_code == 200
