import asyncio
import json
import time
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import require_api_key
from app.schemas.codex import CodexRunRequest, CodexRunResponse


router = APIRouter(prefix="/codex", tags=["codex"], dependencies=[Depends(require_api_key)])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CODEX_TIMEOUT_SECONDS = 900
_codex_lock = asyncio.Lock()


@router.post("/runs", response_model=CodexRunResponse)
async def run_codex(payload: CodexRunRequest) -> CodexRunResponse:
    if not settings.allow_web_codex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web Codex is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true to enable it.",
        )

    if _codex_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Codex task is already running. Wait for it to finish before starting another.",
        )

    async with _codex_lock:
        started_at = time.monotonic()
        prompt = _build_prompt(payload.prompt.strip())

        try:
            process = await asyncio.create_subprocess_exec(
                settings.codex_bin,
                "exec",
                "--cd",
                str(PROJECT_ROOT),
                "--sandbox",
                "workspace-write",
                "--color",
                "never",
                "-",
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to start Codex: {exc}",
            ) from exc

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(prompt.encode("utf-8")),
                timeout=CODEX_TIMEOUT_SECONDS,
            )
        except TimeoutError as exc:
            process.kill()
            await process.wait()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Codex task timed out before finishing.",
            ) from exc

        duration_seconds = round(time.monotonic() - started_at, 2)
        git_status = await _read_git_status()

    return CodexRunResponse(
        output=stdout_bytes.decode("utf-8", errors="replace").strip(),
        error_output=stderr_bytes.decode("utf-8", errors="replace").strip(),
        exit_code=process.returncode or 0,
        duration_seconds=duration_seconds,
        git_status=git_status,
    )


@router.post("/runs/stream")
async def stream_codex(payload: CodexRunRequest) -> StreamingResponse:
    if not settings.allow_web_codex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web Codex is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true to enable it.",
        )

    if _codex_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Codex task is already running. Wait for it to finish before starting another.",
        )

    return StreamingResponse(
        _stream_codex_events(payload.prompt.strip()),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store"},
    )


def _build_prompt(user_prompt: str) -> str:
    return "\n".join(
        [
            "You are running from the trustedKnowledge web AI coding interface.",
            "Follow the repository AGENTS.md instructions strictly.",
            "Do not start, stop, or restart frontend/backend services.",
            "When service restart is needed, tell the user to use the web restart button.",
            "",
            "User request:",
            user_prompt,
        ]
    )


async def _stream_codex_events(user_prompt: str) -> AsyncIterator[str]:
    async with _codex_lock:
        started_at = time.monotonic()
        prompt = _build_prompt(user_prompt)
        stdout_parts: list[str] = []
        stderr_parts: list[str] = []
        queue: asyncio.Queue[dict[str, str]] = asyncio.Queue()

        yield _json_line({"type": "status", "message": "Codex started."})

        try:
            process = await asyncio.create_subprocess_exec(
                settings.codex_bin,
                "exec",
                "--json",
                "--cd",
                str(PROJECT_ROOT),
                "--sandbox",
                "workspace-write",
                "--color",
                "never",
                "-",
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            yield _json_line({"type": "error", "message": f"Failed to start Codex: {exc}"})
            return

        assert process.stdin is not None
        process.stdin.write(prompt.encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()

        stdout_task = asyncio.create_task(_read_process_lines("stdout", process.stdout, queue, stdout_parts))
        stderr_task = asyncio.create_task(_read_process_lines("stderr", process.stderr, queue, stderr_parts))
        wait_task = asyncio.create_task(process.wait())
        deadline = time.monotonic() + CODEX_TIMEOUT_SECONDS

        while True:
            if time.monotonic() > deadline:
                process.kill()
                await process.wait()
                yield _json_line({"type": "error", "message": "Codex task timed out before finishing."})
                break

            try:
                event = await asyncio.wait_for(queue.get(), timeout=1)
                yield _json_line(event)
            except TimeoutError:
                yield _json_line({"type": "heartbeat", "message": "Codex is still running."})

            if wait_task.done() and stdout_task.done() and stderr_task.done() and queue.empty():
                break

        await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
        if not wait_task.done():
            await wait_task

        duration_seconds = round(time.monotonic() - started_at, 2)
        git_status = await _read_git_status()
        response = CodexRunResponse(
            output="\n".join(stdout_parts).strip(),
            error_output="\n".join(stderr_parts).strip(),
            exit_code=process.returncode or 0,
            duration_seconds=duration_seconds,
            git_status=git_status,
        )
        yield _json_line({"type": "complete", "response": response.model_dump()})


async def _read_process_lines(
    stream_name: str,
    stream: asyncio.StreamReader | None,
    queue: asyncio.Queue[dict[str, str]],
    parts: list[str],
) -> None:
    if stream is None:
        return

    while True:
        line = await stream.readline()
        if not line:
            return
        text = line.decode("utf-8", errors="replace").rstrip("\n")
        if not text:
            continue
        parts.append(text)
        await queue.put({"type": stream_name, "message": text})


def _json_line(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False) + "\n"


async def _read_git_status() -> str:
    process = await asyncio.create_subprocess_exec(
        "git",
        "status",
        "--short",
        cwd=PROJECT_ROOT,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout_bytes, stderr_bytes = await process.communicate()
    if process.returncode == 0:
        return stdout_bytes.decode("utf-8", errors="replace").strip()
    return stderr_bytes.decode("utf-8", errors="replace").strip()
