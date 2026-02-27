import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, MagicMock
from jose import jwt

from app.main import app
from app.core.config import settings


# for settings override

@pytest.fixture(autouse=True)
def override_settings(monkeypatch):
    """Force safe defaults for every test automatically."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "AUTH_SECRET", "test-secret")


# HTTP client

@pytest.fixture
async def client():
    """Async test client wired directly to the app — no real network."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


# Auth helpers

@pytest.fixture
def make_token():
    """
    Factory fixture — create a JWT with any role.

    Usage:
        token = make_token() -----# default hr_manager
        token = make_token(role="admin")
        token = make_token(role="viewer")
    """
    def _make(
        user_id: str = "test-user-id",
        email: str = "test@example.com",
        role: str = "hr_manager",
    ) -> str:
        return jwt.encode(
            {"id": user_id, "email": email, "role": role},
            "test-secret",
            algorithm="HS256",
        )
    return _make


@pytest.fixture
def auth_headers(make_token):
    """Ready-made auth headers for an hr_manager user."""
    return {"Authorization": f"Bearer {make_token()}"}


@pytest.fixture
def admin_headers(make_token):
    """Ready-made auth headers for an admin user."""
    return {"Authorization": f"Bearer {make_token(role='admin')}"}


@pytest.fixture
def viewer_headers(make_token):
    """Ready-made auth headers for a viewer user."""
    return {"Authorization": f"Bearer {make_token(role='viewer')}"}
