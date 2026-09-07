import asyncio
from contextlib import suppress
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.api import codex
from app.core.security import require_current_user
from app.repositories.users import AuthContext
from app.schemas.codex import CodexJobSnapshot, CodexRunRequest


# This router deliberately has no AI Coding module dependency.  It accepts only
# configured-model, read-only content processing jobs and keeps the same per-user
# ownership checks as the original job store.
router = APIRouter(prefix="/knowledge-processing", tags=["knowledge-processing"])


@router.post("/jobs", response_model=CodexJobSnapshot, status_code=status.HTTP_202_ACCEPTED)
async def start_knowledge_processing_job(
    payload: CodexRunRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> CodexJobSnapshot:
    if payload.execution_provider != "history_ask_llm" or payload.output_mode != "final" or payload.sandbox_mode != "read-only":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="知识加工只能使用已配置模型和只读最终输出模式。")
    await codex._reconcile_codex_jobs(auth_context.username)
    config = await codex._get_enabled_history_ask_llm_config(payload.model_name)
    if not await codex._try_reserve_codex_slot(auth_context.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=codex._codex_concurrency_conflict_detail())

    job = codex.CodexJobState(
        job_id=uuid4().hex,
        owner_username=auth_context.username,
        prompt=payload.prompt.strip(),
        model_name=str(config["model_name"]),
        model_selector=payload.model_name,
        skill_ids=payload.skill_ids,
        sandbox_mode="read-only",
        output_mode="final",
        execution_provider="history_ask_llm",
        slot_reserved=True,
    )
    codex._codex_jobs[job.job_id] = job
    codex._latest_codex_job_ids[auth_context.username] = job.job_id
    try:
        task = asyncio.create_task(codex._run_codex_job(job, auth_context))
    except Exception:
        await codex._release_job_slot(job)
        raise
    codex._codex_job_tasks[job.job_id] = task
    task.add_done_callback(lambda completed_task: codex._handle_codex_job_task_done(job, completed_task))
    return codex._snapshot_codex_job(job)


@router.get("/jobs/{job_id}", response_model=CodexJobSnapshot)
async def get_knowledge_processing_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> CodexJobSnapshot:
    await codex._reconcile_codex_jobs(auth_context.username)
    job = _owned_processing_job(job_id, auth_context)
    return codex._snapshot_codex_job(job)


@router.delete("/jobs/{job_id}", response_model=CodexJobSnapshot)
async def cancel_knowledge_processing_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> CodexJobSnapshot:
    await codex._reconcile_codex_jobs(auth_context.username)
    job = _owned_processing_job(job_id, auth_context)
    if job.status != "running":
        return codex._snapshot_codex_job(job)
    codex._mark_codex_job_cancelled(job, "知识加工任务已被用户取消。")
    task = codex._codex_job_tasks.get(job.job_id)
    if task is not None and not task.done():
        task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await task
    await codex._release_job_slot(job)
    return codex._snapshot_codex_job(job)


def _owned_processing_job(job_id: str, auth_context: AuthContext) -> codex.CodexJobState:
    job = codex._codex_jobs.get(job_id)
    if job is None or job.owner_username != auth_context.username or job.output_mode != "final" or job.execution_provider != "history_ask_llm":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="知识加工任务不存在。")
    return job
