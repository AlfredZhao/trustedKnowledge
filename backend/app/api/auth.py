from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.security import validate_login
from app.schemas.auth import LoginRequest, LoginResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    if not validate_login(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return LoginResponse(api_key=settings.api_key)
