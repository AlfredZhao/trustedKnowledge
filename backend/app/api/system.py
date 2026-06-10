import subprocess
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import require_api_key
from app.schemas.system import RestartRequest, RestartResponse


router = APIRouter(prefix="/system", tags=["system"], dependencies=[Depends(require_api_key)])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RESTART_SCRIPT = PROJECT_ROOT / "scripts" / "restart-all.sh"
RESTART_LOG = PROJECT_ROOT / "logs" / "web-restart.log"
RESTART_COOLDOWN_SECONDS = 45

_last_restart_requested_at = 0.0


@router.post("/restart", response_model=RestartResponse, status_code=status.HTTP_202_ACCEPTED)
async def restart_services(payload: RestartRequest) -> RestartResponse:
    global _last_restart_requested_at

    if not settings.allow_web_restart:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web restart is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_RESTART=true to enable it.",
        )

    if payload.confirm != "RESTART":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restart confirmation must be RESTART.",
        )

    if not RESTART_SCRIPT.is_file():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restart script not found: {RESTART_SCRIPT}",
        )

    now = time.monotonic()
    if now - _last_restart_requested_at < RESTART_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A restart was requested recently. Wait a moment before trying again.",
        )

    _last_restart_requested_at = now
    RESTART_LOG.parent.mkdir(parents=True, exist_ok=True)

    command = f"sleep 1; exec {RESTART_SCRIPT} >> {RESTART_LOG} 2>&1"
    try:
        subprocess.Popen(
            ["bash", "-lc", command],
            cwd=PROJECT_ROOT,
            start_new_session=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except OSError as exc:
        _last_restart_requested_at = 0.0
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start restart task: {exc}",
        ) from exc

    return RestartResponse(
        accepted=True,
        message="Restart accepted. Services will restart shortly.",
        log_path=str(RESTART_LOG),
    )
