import asyncio
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import require_api_key
from app.schemas.system import GithubReleaseRequest, GithubSyncResponse, RestartRequest, RestartResponse


router = APIRouter(prefix="/system", tags=["system"], dependencies=[Depends(require_api_key)])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RESTART_SCRIPT = PROJECT_ROOT / "scripts" / "restart-all.sh"
RESTART_LOG = PROJECT_ROOT / "logs" / "web-restart.log"
RESTART_COOLDOWN_SECONDS = 45
GITHUB_SYNC_SCRIPT = PROJECT_ROOT / "scripts" / "commit-to-github.sh"
GITHUB_SYNC_LOG = PROJECT_ROOT / "logs" / "web-github-sync.log"
GITHUB_SYNC_TIMEOUT_SECONDS = 600

_last_restart_requested_at = 0.0
_github_sync_lock = asyncio.Lock()


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


@router.post("/github-sync", response_model=GithubSyncResponse)
async def sync_code_to_github() -> GithubSyncResponse:
    return await _run_github_script([], "GitHub sync completed.", "GitHub sync failed.")


@router.post("/github-release", response_model=GithubSyncResponse)
async def release_code_to_github(payload: GithubReleaseRequest) -> GithubSyncResponse:
    if payload.confirm != "ok":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release confirmation must be ok.",
        )

    return await _run_github_script(
        ["--version", payload.version],
        "GitHub release completed.",
        "GitHub release failed.",
    )


async def _run_github_script(arguments: list[str], success_message: str, failure_message: str) -> GithubSyncResponse:
    if _github_sync_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A GitHub sync task is already running. Wait for it to finish before starting another.",
        )

    if not GITHUB_SYNC_SCRIPT.is_file():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GitHub sync script not found: {GITHUB_SYNC_SCRIPT}",
        )

    GITHUB_SYNC_LOG.parent.mkdir(parents=True, exist_ok=True)

    async with _github_sync_lock:
        try:
            process = await asyncio.create_subprocess_exec(
                "bash",
                str(GITHUB_SYNC_SCRIPT),
                *arguments,
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start GitHub sync task: {exc}",
            ) from exc

        try:
            output_bytes, _ = await asyncio.wait_for(process.communicate(), timeout=GITHUB_SYNC_TIMEOUT_SECONDS)
        except TimeoutError as exc:
            process.kill()
            await process.wait()
            timeout_output = f"GitHub sync task timed out after {GITHUB_SYNC_TIMEOUT_SECONDS} seconds."
            _append_github_sync_log(timeout_output)
            return GithubSyncResponse(
                success=False,
                message="GitHub sync timed out.",
                exit_code=124,
                output_tail=timeout_output,
                log_path=str(GITHUB_SYNC_LOG),
                completed_at=datetime.now(UTC).isoformat(),
            )

    output = output_bytes.decode("utf-8", errors="replace")
    _append_github_sync_log(output)
    exit_code = process.returncode or 0
    return GithubSyncResponse(
        success=exit_code == 0,
        message=success_message if exit_code == 0 else failure_message,
        exit_code=exit_code,
        output_tail=_tail_non_empty_lines(output, 5),
        log_path=str(GITHUB_SYNC_LOG),
        completed_at=datetime.now(UTC).isoformat(),
    )


def _append_github_sync_log(output: str) -> None:
    timestamp = datetime.now(UTC).isoformat()
    with GITHUB_SYNC_LOG.open("a", encoding="utf-8") as log_file:
        log_file.write(f"\n===== GitHub sync {timestamp} =====\n")
        log_file.write(output.rstrip() or "(no output)")
        log_file.write("\n")


def _tail_non_empty_lines(value: str, line_count: int) -> str:
    lines = [line.rstrip() for line in value.splitlines() if line.strip()]
    return "\n".join(lines[-line_count:]) if lines else "(no output)"
