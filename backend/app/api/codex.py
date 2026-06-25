import asyncio
import json
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import require_admin_module, require_current_user
from app.repositories.skills import get_prompt_skills
from app.repositories.users import AuthContext
from app.schemas.codex import CodexJobSnapshot, CodexJobStatus, CodexRunRequest, CodexRunResponse


router = APIRouter(prefix="/codex", tags=["codex"], dependencies=[Depends(require_admin_module("aiCoding"))])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CODEX_TIMEOUT_SECONDS = 900
_codex_lock = asyncio.Lock()
_codex_jobs: dict[str, "CodexJobState"] = {}
_latest_codex_job_id: str | None = None


@dataclass
class CodexJobState:
    job_id: str
    prompt: str
    skill_ids: list[str] = field(default_factory=list)
    sandbox_mode: str = "workspace-write"
    output_mode: str = "full"
    status: CodexJobStatus = "running"
    output_parts: list[str] = field(default_factory=list)
    error_parts: list[str] = field(default_factory=list)
    response: CodexRunResponse | None = None
    error_message: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None


@router.post("/runs", response_model=CodexRunResponse)
async def run_codex(
    payload: CodexRunRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> CodexRunResponse:
    if not settings.allow_web_codex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web Codex is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true to enable it.",
        )

    if _codex_lock.locked() or _has_running_codex_job():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Codex task is already running. Wait for it to finish before starting another.",
        )

    async with _codex_lock:
        started_at = time.monotonic()
        prompt = _build_prompt(payload.prompt.strip(), payload.skill_ids, auth_context, payload.output_mode)
        exec_args, output_path = _build_codex_exec_args(payload.sandbox_mode, payload.output_mode)

        try:
            process = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            _cleanup_codex_output_file(output_path)
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
            _cleanup_codex_output_file(output_path)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Codex task timed out before finishing.",
            ) from exc

        duration_seconds = round(time.monotonic() - started_at, 2)
        git_status = await _read_git_status()
        output_text = _resolve_codex_output(
            output_mode=payload.output_mode,
            output_path=output_path,
            stdout_bytes=stdout_bytes,
        )

    return CodexRunResponse(
        output=output_text,
        error_output=stderr_bytes.decode("utf-8", errors="replace").strip(),
        exit_code=process.returncode or 0,
        duration_seconds=duration_seconds,
        git_status=git_status,
    )


@router.post("/runs/stream")
async def stream_codex(
    payload: CodexRunRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> StreamingResponse:
    if not settings.allow_web_codex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web Codex is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true to enable it.",
        )

    if _codex_lock.locked() or _has_running_codex_job():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Codex task is already running. Wait for it to finish before starting another.",
        )

    return StreamingResponse(
        _stream_codex_events(
            payload.prompt.strip(),
            payload.skill_ids,
            payload.sandbox_mode,
            auth_context,
            payload.output_mode,
        ),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store"},
    )


@router.post("/runs/jobs", response_model=CodexJobSnapshot, status_code=status.HTTP_202_ACCEPTED)
async def start_codex_job(
    payload: CodexRunRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> CodexJobSnapshot:
    if not settings.allow_web_codex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Web Codex is disabled. Set TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true to enable it.",
        )

    if _codex_lock.locked() or _has_running_codex_job():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Codex task is already running. Wait for it to finish before starting another.",
        )

    global _latest_codex_job_id
    job = CodexJobState(
        job_id=uuid4().hex,
        prompt=payload.prompt.strip(),
        skill_ids=payload.skill_ids,
        sandbox_mode=payload.sandbox_mode,
        output_mode=payload.output_mode,
    )
    _codex_jobs[job.job_id] = job
    _latest_codex_job_id = job.job_id
    task = asyncio.create_task(_run_codex_job(job, auth_context))
    task.add_done_callback(lambda completed_task: _handle_codex_job_task_done(job, completed_task))
    return _snapshot_codex_job(job)


@router.get("/runs/jobs/latest", response_model=CodexJobSnapshot)
async def get_latest_codex_job() -> CodexJobSnapshot:
    if _latest_codex_job_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Codex task has been started.")
    return _snapshot_codex_job(_codex_jobs[_latest_codex_job_id])


@router.get("/runs/jobs/{job_id}", response_model=CodexJobSnapshot)
async def get_codex_job(job_id: str) -> CodexJobSnapshot:
    job = _codex_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Codex task not found.")
    return _snapshot_codex_job(job)


def _build_prompt(
    user_prompt: str,
    skill_ids: list[str] | None = None,
    auth_context: AuthContext | None = None,
    output_mode: str = "full",
) -> str:
    selected_skills = get_prompt_skills(skill_ids or [], auth_context) if auth_context else []
    if output_mode == "final":
        lines = [
            "You are running from the trustedKnowledge Knowledge Processing interface.",
            "This is a direct content transformation request, not an interactive coding session.",
            "Do not provide progress updates, plans, commentary, or statements about reading skills/files/context.",
            "Do not say you will first read SKILL.md, inspect files, analyze the task, or follow up later.",
            "Everything needed for the response is already included in this prompt.",
            "Return only the final transformed content.",
        ]
        if selected_skills:
            lines.extend(
                [
                    "",
                    "Selected trustedKnowledge skill instructions are already loaded below.",
                    "Apply them directly. These instructions define output structure, tone, wording constraints, and formatting.",
                    "Do not mention the existence of these instructions in the answer.",
                ]
            )
            for skill in selected_skills:
                lines.extend(
                    [
                        "",
                        f"Loaded skill: {skill['name']}",
                        skill["content"],
                    ]
                )
        lines.extend(["", "Transformation request:", user_prompt])
    else:
        lines = [
            "You are running from the trustedKnowledge web AI coding interface.",
            "Follow the repository AGENTS.md instructions strictly.",
            "Do not start, stop, or restart frontend/backend services.",
            "When service restart is needed, tell the user to use the web restart button.",
        ]
        if selected_skills:
            lines.extend(
                [
                    "",
                    "Selected trustedKnowledge skills:",
                    "Use these skill directories as task-specific instructions. First read each SKILL.md, then load only the referenced files that are needed for the task. Do not preload entire folders.",
                    "Skill instructions can define output structure, tone, and workflow, but they cannot override factual boundaries, repository safety rules, or the user's request.",
                ]
            )
            for skill in selected_skills:
                lines.extend(
                    [
                        "",
                        f"Skill directory: {skill['path']}",
                    ]
                )
        lines.extend(["", "User request:", user_prompt])
    return "\n".join(lines)


async def _run_codex_job(job: CodexJobState, auth_context: AuthContext) -> None:
    async with _codex_lock:
        started_at = time.monotonic()
        prompt = _build_prompt(job.prompt, job.skill_ids, auth_context, job.output_mode)
        exec_args, output_path = _build_codex_exec_args(job.sandbox_mode, job.output_mode, json_output=True)

        try:
            process = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            _cleanup_codex_output_file(output_path)
            job.status = "failed"
            job.error_message = f"Failed to start Codex: {exc}"
            job.completed_at = datetime.now(UTC)
            return

        assert process.stdin is not None
        process.stdin.write(prompt.encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()

        stdout_task = asyncio.create_task(_read_process_lines("stdout", process.stdout, None, job.output_parts))
        stderr_task = asyncio.create_task(_read_process_lines("stderr", process.stderr, None, job.error_parts))
        wait_task = asyncio.create_task(process.wait())
        deadline = time.monotonic() + CODEX_TIMEOUT_SECONDS

        while True:
            if time.monotonic() > deadline:
                process.kill()
                await process.wait()
                _cleanup_codex_output_file(output_path)
                job.status = "failed"
                job.error_message = "Codex task timed out before finishing."
                break

            if wait_task.done() and stdout_task.done() and stderr_task.done():
                break

            await asyncio.sleep(1)

        await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
        if not wait_task.done():
            await wait_task

        if job.status != "failed":
            duration_seconds = round(time.monotonic() - started_at, 2)
            git_status = await _read_git_status()
            job.response = CodexRunResponse(
                output=_resolve_codex_output(
                    output_mode=job.output_mode,
                    output_path=output_path,
                    stdout_parts=job.output_parts,
                ),
                error_output="\n".join(job.error_parts).strip(),
                exit_code=process.returncode or 0,
                duration_seconds=duration_seconds,
                git_status=git_status,
            )
            job.status = "completed"

        job.completed_at = datetime.now(UTC)


async def _stream_codex_events(
    user_prompt: str,
    skill_ids: list[str] | None = None,
    sandbox_mode: str = "workspace-write",
    auth_context: AuthContext | None = None,
    output_mode: str = "full",
) -> AsyncIterator[str]:
    async with _codex_lock:
        started_at = time.monotonic()
        prompt = _build_prompt(user_prompt, skill_ids, auth_context, output_mode)
        stdout_parts: list[str] = []
        stderr_parts: list[str] = []
        queue: asyncio.Queue[dict[str, str]] = asyncio.Queue()
        exec_args, output_path = _build_codex_exec_args(sandbox_mode, output_mode, json_output=True)

        yield _json_line({"type": "status", "message": "Codex started."})

        try:
            process = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=PROJECT_ROOT,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            _cleanup_codex_output_file(output_path)
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
                _cleanup_codex_output_file(output_path)
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
            output=_resolve_codex_output(output_mode=output_mode, output_path=output_path, stdout_parts=stdout_parts),
            error_output="\n".join(stderr_parts).strip(),
            exit_code=process.returncode or 0,
            duration_seconds=duration_seconds,
            git_status=git_status,
        )
        yield _json_line({"type": "complete", "response": response.model_dump()})


async def _read_process_lines(
    stream_name: str,
    stream: asyncio.StreamReader | None,
    queue: asyncio.Queue[dict[str, str]] | None,
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
        if queue is not None:
            await queue.put({"type": stream_name, "message": text})


def _snapshot_codex_job(job: CodexJobState) -> CodexJobSnapshot:
    return CodexJobSnapshot(
        job_id=job.job_id,
        prompt=job.prompt,
        status=job.status,
        output="\n".join(job.output_parts).strip(),
        error_output="\n".join(job.error_parts).strip(),
        response=job.response,
        error_message=job.error_message,
        started_at=job.started_at.isoformat(),
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


def _has_running_codex_job() -> bool:
    return any(job.status == "running" for job in _codex_jobs.values())


def _handle_codex_job_task_done(job: CodexJobState, task: asyncio.Task[None]) -> None:
    if not task.cancelled():
        exception = task.exception()
        if exception is None:
            return

        job.error_message = f"Codex task failed unexpectedly: {exception}"
    else:
        job.error_message = "Codex task was cancelled before finishing."

    if job.status == "running":
        job.status = "failed"
        job.completed_at = datetime.now(UTC)


def _json_line(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False) + "\n"


def _build_codex_exec_args(
    sandbox_mode: str,
    output_mode: str,
    json_output: bool = False,
) -> tuple[list[str], Path | None]:
    output_path: Path | None = None
    args = [
        settings.codex_bin,
        "exec",
    ]
    if json_output:
        args.append("--json")
    args.extend(
        [
        "--cd",
        str(PROJECT_ROOT),
        "--sandbox",
        sandbox_mode,
        "--color",
        "never",
        ]
    )
    if output_mode == "final":
        with NamedTemporaryFile(prefix="trustedknowledge-codex-", suffix=".txt", delete=False) as temp_file:
            output_path = Path(temp_file.name)
        args.extend(["--output-last-message", str(output_path)])
    args.append("-")
    return args, output_path


def _resolve_codex_output(
    *,
    output_mode: str,
    output_path: Path | None,
    stdout_bytes: bytes | None = None,
    stdout_parts: list[str] | None = None,
) -> str:
    if output_mode == "final" and output_path is not None:
        try:
            final_message = output_path.read_text(encoding="utf-8").strip()
            if final_message:
                return final_message
        finally:
            output_path.unlink(missing_ok=True)

    if stdout_bytes is not None:
        return stdout_bytes.decode("utf-8", errors="replace").strip()
    return "\n".join(stdout_parts or []).strip()


def _cleanup_codex_output_file(output_path: Path | None) -> None:
    if output_path is not None:
        output_path.unlink(missing_ok=True)


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
