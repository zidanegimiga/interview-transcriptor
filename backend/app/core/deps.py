import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def get_database() -> AsyncIOMotorDatabase:
    return get_db()


DBDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer_scheme),
    ],
) -> dict:
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise auth_error

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.AUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("id") or payload.get("sub")
        if not user_id:
            raise auth_error

        return {
            "id": user_id,
            "email": payload.get("email", ""),
            "role": payload.get("role", "viewer"),
        }

    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise auth_error


CurrentUser = Annotated[dict, Depends(get_current_user)]