from secrets import compare_digest
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.config import settings


ApiKeyHeader = Annotated[str | None, Header(alias="X-API-Key")]


async def require_api_key(x_api_key: ApiKeyHeader = None) -> None:
    if x_api_key and compare_digest(x_api_key, settings.api_key):
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
    )


def validate_login(username: str, password: str) -> bool:
    return compare_digest(username, settings.admin_username) and compare_digest(
        password,
        settings.admin_password,
    )

