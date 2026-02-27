import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch
from jose import jwt

from app.core.config import settings


# Settings override

@pytest.fixture(autouse=True)
def override_settings(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "AUTH_SECRET", "test-secret")


# Mock database 

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """
    Replace the real MongoDB with a mock for all tests.
    All cursor methods that return awaitables are AsyncMock.
    find() and aggregate() return a mock cursor whose .to_list() is async.
    """
    def make_cursor(return_value=None):
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=return_value or [])
        cursor.sort = MagicMock(return_value=cursor)
        cursor.skip = MagicMock(return_value=cursor)
        cursor.limit = MagicMock(return_value=cursor)
        return cursor

    mock_collection = MagicMock()
    mock_collection.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="mock-inserted-id")
    )
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.find = MagicMock(return_value=make_cursor())
    mock_collection.aggregate = MagicMock(return_value=make_cursor())
    mock_collection.update_one = AsyncMock(
        return_value=MagicMock(matched_count=1, modified_count=1)
    )
    mock_collection.delete_one = AsyncMock(
        return_value=MagicMock(deleted_count=1)
    )
    mock_collection.count_documents = AsyncMock(return_value=0)

    mock_database = MagicMock()
    mock_database.__getitem__ = MagicMock(return_value=mock_collection)

    monkeypatch.setattr("app.core.database._db", mock_database)

    return mock_database


# HTTP client 

@pytest.fixture
async def client():
    """
    Async test client.
    Patches connect_db and disconnect_db so lifespan
    does not attempt to reach Atlas during tests.
    """
    with patch("app.core.database.connect_db", new=AsyncMock()), \
         patch("app.core.database.disconnect_db", new=AsyncMock()):
        async with AsyncClient(
            transport=ASGITransport(app=__import__("app.main", fromlist=["app"]).app),
            base_url="http://testserver",
        ) as ac:
            yield ac


# Auth helpers 

@pytest.fixture
def make_token():
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
    return {"Authorization": f"Bearer {make_token()}"}


@pytest.fixture
def admin_headers(make_token):
    return {"Authorization": f"Bearer {make_token(role='admin')}"}


@pytest.fixture
def viewer_headers(make_token):
    return {"Authorization": f"Bearer {make_token(role='viewer')}"}
