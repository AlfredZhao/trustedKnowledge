from secrets import compare_digest
import hashlib
import hmac
import time
from secrets import token_urlsafe
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


def create_oauth_state() -> str:
    nonce = token_urlsafe(16)
    timestamp = str(int(time.time()))
    message = f"{nonce}.{timestamp}"
    signature = hmac.new(settings.api_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{message}.{signature}"


def validate_oauth_state(state: str | None, max_age_seconds: int = 600) -> bool:
    if not state:
        return False

    parts = state.split(".")
    if len(parts) != 3:
        return False

    nonce, timestamp, signature = parts
    if not nonce or not timestamp or not signature:
        return False

    try:
        issued_at = int(timestamp)
    except ValueError:
        return False

    if abs(int(time.time()) - issued_at) > max_age_seconds:
        return False

    message = f"{nonce}.{timestamp}"
    expected = hmac.new(settings.api_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return compare_digest(signature, expected)
