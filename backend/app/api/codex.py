import asyncio
import json
import time
from collections.abc import AsyncIterator
from contextlib import suppress
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import require_admin_module, require_current_user
from app.db.oracle import acquire_connection
from app.repositories.history_ask import _call_history_ask_llm, _format_selected_skills_for_prompt
from app.repositories.llm_config import ensure_llm_config_table, get_history_ask_llm_config
from app.repositories.skills import get_prompt_skills
from app.services.codex_cli import CODEX_AVAILABLE_MODELS, read_codex_default_model, resolve_codex_model_name
from app.repositories.users import AuthContext
from app.schemas.codex import (
    CodexConfigResponse,
    CodexJobSnapshot,
    CodexJobStatus,
    CodexRunRequest,
    CodexRunResponse,
    ProjectChangelogResponse,
)


router = APIRouter(prefix="/codex", tags=["codex"], dependencies=[Depends(require_admin_module("aiCoding"))])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CHANGELOG_PATH = PROJECT_ROOT / "CHANGELOG.md"
CODEX_TIMEOUT_SECONDS = 900
_codex_state_locks: dict[str, asyncio.Lock] = {}
_codex_active_run_counts: dict[str, int] = {}
_codex_jobs: dict[str, "CodexJobState"] = {}
_latest_codex_job_ids: dict[str, str] = {}
_codex_job_tasks: dict[str, asyncio.Task[None]] = {}
_codex_job_processes: dict[str, asyncio.subprocess.Process] = {}


@dataclass
class CodexJobState:
    job_id: str
    owner_username: str
    prompt: str
    model_name: str | None = None
    skill_ids: list[str] = field(default_factory=list)
    sandbox_mode: str = "workspace-write"
    output_mode: str = "full"
    execution_provider: str = "codex"
    status: CodexJobStatus = "running"
    output_parts: list[str] = field(default_factory=list)
    error_parts: list[str] = field(default_factory=list)
    response: CodexRunResponse | None = None
    error_message: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    last_activity_at: datetime | None = None
    last_event: str | None = None
    slot_reserved: bool = False


@router.get("/config", response_model=CodexConfigResponse)
async def get_codex_config() -> CodexConfigResponse:
    return CodexConfigResponse(
        default_model_name=read_codex_default_model(PROJECT_ROOT),
        available_models=CODEX_AVAILABLE_MODELS,
    )


@router.get("/project-changelog", response_model=ProjectChangelogResponse)
async def get_project_changelog() -> ProjectChangelogResponse:
    if not CHANGELOG_PATH.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project CHANGELOG.md was not found.",
        )

    try:
        stat = CHANGELOG_PATH.stat()
        markdown = CHANGELOG_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read project CHANGELOG.md: {exc}",
        ) from exc

    return ProjectChangelogResponse(
        markdown=markdown,
        updated_at=datetime.fromtimestamp(stat.st_mtime, UTC).isoformat(),
    )


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

    await _reconcile_codex_jobs(auth_context.username)
    if not await _try_reserve_codex_slot(auth_context.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_codex_concurrency_conflict_detail())

    try:
        started_at = time.monotonic()
        prompt = _build_prompt(payload.prompt.strip(), payload.skill_ids, auth_context, payload.output_mode)
        model_name = resolve_codex_model_name(payload.model_name, PROJECT_ROOT)
        exec_args, output_path = _build_codex_exec_args(payload.sandbox_mode, payload.output_mode, model_name=model_name)

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
    finally:
        await _release_codex_slot(auth_context.username)

    return CodexRunResponse(
        output=output_text,
        error_output=stderr_bytes.decode("utf-8", errors="replace").strip(),
        exit_code=process.returncode or 0,
        duration_seconds=duration_seconds,
        git_status=git_status,
        model_name=model_name,
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

    await _reconcile_codex_jobs(auth_context.username)
    if not await _try_reserve_codex_slot(auth_context.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_codex_concurrency_conflict_detail())

    return StreamingResponse(
        _stream_codex_events(
            payload.prompt.strip(),
            payload.skill_ids,
            payload.sandbox_mode,
            auth_context,
            payload.output_mode,
            payload.model_name,
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

    await _reconcile_codex_jobs(auth_context.username)
    execution_provider = payload.execution_provider
    model_name = resolve_codex_model_name(payload.model_name, PROJECT_ROOT)
    if execution_provider == "history_ask_llm":
        history_ask_config = await _get_enabled_history_ask_llm_config()
        model_name = str(history_ask_config["model_name"])
    if not await _try_reserve_codex_slot(auth_context.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_codex_concurrency_conflict_detail())

    job = CodexJobState(
        job_id=uuid4().hex,
        owner_username=auth_context.username,
        prompt=payload.prompt.strip(),
        model_name=model_name,
        skill_ids=payload.skill_ids,
        sandbox_mode=payload.sandbox_mode,
        output_mode=payload.output_mode,
        execution_provider=execution_provider,
        slot_reserved=True,
    )
    _codex_jobs[job.job_id] = job
    _latest_codex_job_ids[auth_context.username] = job.job_id
    try:
        task = asyncio.create_task(_run_codex_job(job, auth_context))
    except Exception:
        await _release_job_slot(job)
        raise
    _codex_job_tasks[job.job_id] = task
    task.add_done_callback(lambda completed_task: _handle_codex_job_task_done(job, completed_task))
    return _snapshot_codex_job(job)


@router.get("/runs/jobs/latest", response_model=CodexJobSnapshot)
async def get_latest_codex_job(
    output_mode: Literal["full", "final"] | None = Query(default=None),
    auth_context: AuthContext = Depends(require_current_user),
) -> CodexJobSnapshot:
    await _reconcile_codex_jobs(auth_context.username)
    job = _get_latest_codex_job(auth_context.username, output_mode)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Codex task has been started.")
    return _snapshot_codex_job(job)


@router.get("/runs/jobs/{job_id}", response_model=CodexJobSnapshot)
async def get_codex_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> CodexJobSnapshot:
    await _reconcile_codex_jobs(auth_context.username)
    job = _codex_jobs.get(job_id)
    if job is None or job.owner_username != auth_context.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Codex task not found.")
    return _snapshot_codex_job(job)


@router.delete("/runs/jobs/{job_id}", response_model=CodexJobSnapshot)
async def cancel_codex_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> CodexJobSnapshot:
    await _reconcile_codex_jobs(auth_context.username)
    job = _codex_jobs.get(job_id)
    if job is None or job.owner_username != auth_context.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Codex task not found.")

    if job.status != "running":
        return _snapshot_codex_job(job)

    _mark_codex_job_cancelled(job, "Codex task was terminated by the user.")
    task = _codex_job_tasks.get(job.job_id)
    if task is not None and not task.done():
        task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await task

    process = _codex_job_processes.get(job.job_id)
    if process is not None and process.returncode is None:
        with suppress(ProcessLookupError):
            process.kill()
        with suppress(Exception):
            await process.wait()

    await _release_job_slot(job)
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
            "This is a non-interactive web task: no person can answer terminal approval or input prompts.",
            "Never execute SQLcl or other database commands, service start/stop/restart commands, git push/release commands, or any command that needs confirmation.",
            "For those operations, explain the exact command, its reason, and any prerequisite; leave execution to the user or an explicitly designed web control.",
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
    try:
        if job.execution_provider == "history_ask_llm":
            await _run_history_ask_llm_job(job, auth_context)
            return

        started_at = time.monotonic()
        prompt = _build_prompt(job.prompt, job.skill_ids, auth_context, job.output_mode)
        exec_args, output_path = _build_codex_exec_args(
            job.sandbox_mode,
            job.output_mode,
            json_output=True,
            model_name=job.model_name,
        )
        process: asyncio.subprocess.Process | None = None

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
            _mark_codex_job_failed(job, f"Failed to start Codex: {exc}")
            return

        _codex_job_processes[job.job_id] = process
        job.last_activity_at = datetime.now(UTC)
        job.last_event = "Codex 子进程已启动，正在分析任务。"

        assert process.stdin is not None
        process.stdin.write(prompt.encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()

        stdout_task = asyncio.create_task(_read_process_lines("stdout", process.stdout, None, job.output_parts, job))
        stderr_task = asyncio.create_task(_read_process_lines("stderr", process.stderr, None, job.error_parts, job))
        wait_task = asyncio.create_task(process.wait())
        deadline = time.monotonic() + CODEX_TIMEOUT_SECONDS

        try:
            while True:
                if time.monotonic() > deadline:
                    process.kill()
                    await process.wait()
                    _cleanup_codex_output_file(output_path)
                    _mark_codex_job_failed(job, "Codex task timed out before finishing.")
                    break

                if wait_task.done() and stdout_task.done() and stderr_task.done():
                    break

                await asyncio.sleep(1)
        except asyncio.CancelledError:
            if process.returncode is None:
                with suppress(ProcessLookupError):
                    process.kill()
                with suppress(Exception):
                    await process.wait()
            _cleanup_codex_output_file(output_path)
            if job.status == "running":
                _mark_codex_job_cancelled(job, "Codex task was cancelled before finishing.")
            raise
        finally:
            await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
            if not wait_task.done():
                with suppress(Exception):
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
                model_name=job.model_name,
            )
            job.status = "completed"
            job.completed_at = datetime.now(UTC)
        elif job.completed_at is None:
            job.completed_at = datetime.now(UTC)
        _codex_job_processes.pop(job.job_id, None)
    finally:
        await _release_job_slot(job)


async def _get_enabled_history_ask_llm_config() -> dict[str, object]:
    async with acquire_connection() as connection:
        await ensure_llm_config_table(connection)
        config = await get_history_ask_llm_config(connection)

    if not config["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI 问数模型配置未启用，请先在 AI 问数中保存并启用模型配置。",
        )
    if not config["base_url"] or not config["model_name"] or not config["has_api_key"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI 问数模型配置不完整，需要启用配置、Base URL、模型名和后端 API Key。",
        )
    return config


def _build_history_ask_llm_prompt(job: CodexJobState, auth_context: AuthContext) -> tuple[str, str]:
    selected_skills = get_prompt_skills(job.skill_ids, auth_context)
    skill_instructions = _format_selected_skills_for_prompt(selected_skills)
    prompt_parts = [
        "这是知识加工任务。请仅输出最终加工结果，不要输出过程、计划、说明或代码修改建议。",
    ]
    if skill_instructions:
        prompt_parts.extend(["", "已选择 Skill 的指令：", skill_instructions])
    prompt_parts.extend(["", "用户请求：", job.prompt])
    return (
        "\n".join(prompt_parts),
        "你是 trustedKnowledge 的知识加工助手。严格遵循用户提供的事实与 Skill 指令；若信息不足，保守处理且不要编造。",
    )


async def _run_history_ask_llm_job(job: CodexJobState, auth_context: AuthContext) -> None:
    started_at = time.monotonic()
    try:
        config = await _get_enabled_history_ask_llm_config()
        prompt, system = _build_history_ask_llm_prompt(job, auth_context)
        output = await _call_history_ask_llm(
            config=config,
            prompt=prompt,
            system=system,
            max_tokens=4000,
        )
    except HTTPException as exc:
        _mark_codex_job_failed(job, str(exc.detail))
        return
    except Exception as exc:
        _mark_codex_job_failed(job, f"其他模型调用失败：{exc}")
        return

    job.output_parts.append(output)
    job.response = CodexRunResponse(
        output=output,
        error_output="",
        exit_code=0,
        duration_seconds=round(time.monotonic() - started_at, 2),
        git_status="",
        model_name=job.model_name,
    )
    job.status = "completed"
    job.completed_at = datetime.now(UTC)


async def _stream_codex_events(
    user_prompt: str,
    skill_ids: list[str] | None = None,
    sandbox_mode: str = "workspace-write",
    auth_context: AuthContext | None = None,
    output_mode: str = "full",
    model_name: str = "",
) -> AsyncIterator[str]:
    owner_username = (auth_context.username if auth_context else "").strip()
    try:
        started_at = time.monotonic()
        prompt = _build_prompt(user_prompt, skill_ids, auth_context, output_mode)
        stdout_parts: list[str] = []
        stderr_parts: list[str] = []
        queue: asyncio.Queue[dict[str, str]] = asyncio.Queue()
        effective_model_name = resolve_codex_model_name(model_name, PROJECT_ROOT)
        exec_args, output_path = _build_codex_exec_args(
            sandbox_mode,
            output_mode,
            json_output=True,
            model_name=effective_model_name,
        )

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
            model_name=effective_model_name,
        )
        yield _json_line({"type": "complete", "response": response.model_dump()})
    finally:
        await _release_codex_slot(owner_username)


async def _read_process_lines(
    stream_name: str,
    stream: asyncio.StreamReader | None,
    queue: asyncio.Queue[dict[str, str]] | None,
    parts: list[str],
    job: CodexJobState | None = None,
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
        if job is not None:
            job.last_activity_at = datetime.now(UTC)
            job.last_event = _summarize_codex_event(text, stream_name)
        if queue is not None:
            await queue.put({"type": stream_name, "message": text})


def _summarize_codex_event(text: str, stream_name: str) -> str:
    try:
        event = json.loads(text)
    except json.JSONDecodeError:
        return "Codex 正在输出错误信息。" if stream_name == "stderr" else "Codex 正在处理任务。"
    if not isinstance(event, dict):
        return "Codex 正在处理任务。"
    event_type = str(event.get("type") or "")
    normalized = event_type.lower()
    if any(token in normalized for token in ("approval", "approve", "confirmation")):
        return "Codex 可能在等待审批；Web 任务无法响应交互确认。"
    if "command" in normalized:
        return "Codex 正在执行受沙箱约束的命令。"
    if "error" in normalized or stream_name == "stderr":
        return "Codex 正在输出错误或诊断信息。"
    if "completed" in normalized or "done" in normalized:
        return "Codex 已完成一个执行步骤。"
    return "Codex 正在处理任务。"


def _snapshot_codex_job(job: CodexJobState) -> CodexJobSnapshot:
    return CodexJobSnapshot(
        job_id=job.job_id,
        prompt=job.prompt,
        model_name=job.model_name,
        status=job.status,
        output="\n".join(job.output_parts).strip(),
        error_output="\n".join(job.error_parts).strip(),
        response=job.response,
        error_message=job.error_message,
        started_at=job.started_at.isoformat(),
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        last_activity_at=job.last_activity_at.isoformat() if job.last_activity_at else None,
        last_event=job.last_event,
    )


def _get_codex_state_lock(username: str) -> asyncio.Lock:
    owner_key = username or "__anonymous__"
    lock = _codex_state_locks.get(owner_key)
    if lock is None:
        lock = asyncio.Lock()
        _codex_state_locks[owner_key] = lock
    return lock


def _get_latest_codex_job(username: str, output_mode: Literal["full", "final"] | None = None) -> CodexJobState | None:
    latest_job_id = _latest_codex_job_ids.get(username)
    if latest_job_id:
        latest_job = _codex_jobs.get(latest_job_id)
        if (
            latest_job is not None
            and latest_job.owner_username == username
            and (output_mode is None or latest_job.output_mode == output_mode)
        ):
            return latest_job
        if output_mode is None:
            _latest_codex_job_ids.pop(username, None)

    user_jobs = [
        job
        for job in _codex_jobs.values()
        if job.owner_username == username and (output_mode is None or job.output_mode == output_mode)
    ]
    if not user_jobs:
        return None

    latest_job = max(user_jobs, key=lambda job: job.started_at)
    if output_mode is None:
        _latest_codex_job_ids[username] = latest_job.job_id
    return latest_job


async def _try_reserve_codex_slot(username: str) -> bool:
    owner_key = username or "__anonymous__"
    async with _get_codex_state_lock(owner_key):
        active_count = _codex_active_run_counts.get(owner_key, 0)
        if active_count >= settings.web_codex_user_concurrency:
            return False
        _codex_active_run_counts[owner_key] = active_count + 1
        return True


async def _release_codex_slot(username: str) -> None:
    owner_key = username or "__anonymous__"
    async with _get_codex_state_lock(owner_key):
        active_count = _codex_active_run_counts.get(owner_key, 0)
        if active_count <= 1:
            _codex_active_run_counts.pop(owner_key, None)
            return
        _codex_active_run_counts[owner_key] = active_count - 1


async def _release_job_slot(job: CodexJobState) -> None:
    if not job.slot_reserved:
        return
    job.slot_reserved = False
    await _release_codex_slot(job.owner_username)


def _codex_concurrency_conflict_detail() -> str:
    return (
        "A Codex task is already running. Wait for it to finish before starting another. "
        f"Current per-user Codex concurrency limit: {settings.web_codex_user_concurrency}."
    )


def _handle_codex_job_task_done(job: CodexJobState, task: asyncio.Task[None]) -> None:
    _codex_job_tasks.pop(job.job_id, None)
    _codex_job_processes.pop(job.job_id, None)
    if not task.cancelled():
        exception = task.exception()
        if exception is None:
            return

        _mark_codex_job_failed(job, f"Codex task failed unexpectedly: {exception}")
        return
    elif job.status == "running":
        _mark_codex_job_failed(job, "Codex task was cancelled before finishing.")


def _mark_codex_job_failed(job: CodexJobState, message: str) -> None:
    job.status = "failed"
    job.error_message = message
    if job.completed_at is None:
        job.completed_at = datetime.now(UTC)


def _mark_codex_job_cancelled(job: CodexJobState, message: str) -> None:
    job.status = "cancelled"
    job.error_message = message
    if job.completed_at is None:
        job.completed_at = datetime.now(UTC)


async def _reconcile_codex_jobs(username: str) -> None:
    running_jobs = [job for job in _codex_jobs.values() if job.owner_username == username and job.status == "running"]
    if not running_jobs:
        return

    for job in running_jobs:
        task = _codex_job_tasks.get(job.job_id)
        process = _codex_job_processes.get(job.job_id)

        if task is None:
            _mark_codex_job_failed(job, "Codex task state was lost before finishing. Please retry.")
            await _release_job_slot(job)
            continue

        if task.done():
            if task.cancelled():
                _mark_codex_job_failed(job, "Codex task was cancelled before finishing.")
            else:
                exception = task.exception()
                if exception is not None:
                    _mark_codex_job_failed(job, f"Codex task failed unexpectedly: {exception}")
                elif job.status == "running":
                    _mark_codex_job_failed(job, "Codex task ended without reporting a final status. Please retry.")
            await _release_job_slot(job)
            continue

        runtime_seconds = (datetime.now(UTC) - job.started_at).total_seconds()
        if runtime_seconds <= CODEX_TIMEOUT_SECONDS + 5:
            continue

        task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await task
        if process is not None and process.returncode is None:
            with suppress(ProcessLookupError):
                process.kill()
            with suppress(Exception):
                await process.wait()
        _mark_codex_job_failed(job, "Codex task timed out before finishing.")
        await _release_job_slot(job)


def _json_line(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False) + "\n"


def _build_codex_exec_args(
    sandbox_mode: str,
    output_mode: str,
    json_output: bool = False,
    model_name: str | None = None,
) -> tuple[list[str], Path | None]:
    output_path: Path | None = None
    args = [
        settings.codex_bin,
        "exec",
    ]
    if json_output:
        args.append("--json")
    if model_name:
        args.extend(["--model", model_name])
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
