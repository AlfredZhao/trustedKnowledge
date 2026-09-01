import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import uuid4

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_admin_user, require_current_user
from app.repositories.english_materials import (
    create_english_material,
    get_english_material,
    list_english_materials,
    refresh_english_vectors,
    update_english_material,
)
from app.repositories.english_generation import complete_english_material, generate_english_material
from app.repositories.users import AuthContext
from app.schemas.english_materials import (
    EnglishMaterialCreate,
    EnglishMaterialCompletionRequest,
    EnglishMaterialCompletionJobSnapshot,
    EnglishMaterialCompletionResult,
    EnglishMaterialGenerationRequest,
    EnglishMaterialGenerationResult,
    EnglishMaterialItem,
    EnglishMaterialListResponse,
    EnglishMaterialUpdate,
)


router = APIRouter(prefix="/english-materials", tags=["english-materials"])
logger = logging.getLogger(__name__)
COMPLETION_JOB_TIMEOUT_SECONDS = 100


@dataclass
class EnglishMaterialCompletionJobState:
    job_id: str
    owner_username: str
    fingerprint: str
    payload: EnglishMaterialCompletionRequest
    status: str = "running"
    result: EnglishMaterialCompletionResult | None = None
    error_message: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None


_completion_jobs: dict[str, EnglishMaterialCompletionJobState] = {}
_completion_job_tasks: dict[str, asyncio.Task[None]] = {}


@router.get("", response_model=EnglishMaterialListResponse)
async def get_english_materials(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    include_total: bool = True,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    semantic_query: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    flag: Annotated[int | None, Query(ge=0, le=1)] = None,
    v_needs_update: Annotated[int | None, Query(ge=0, le=1)] = None,
    sort_by: Literal["id", "sequence_no", "category", "base_expression", "title", "flag"] = "id",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialListResponse:
    try:
        items, total = await list_english_materials(
            limit=limit,
            offset=offset,
            include_total=include_total,
            q=q,
            semantic_query=semantic_query,
            username=username,
            category=category,
            flag=flag,
            v_needs_update=v_needs_update,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English materials query") from exc

    return EnglishMaterialListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/refresh-vectors", status_code=status.HTTP_204_NO_CONTENT)
async def post_refresh_english_vectors(_: AuthContext = Depends(require_admin_user)) -> None:
    try:
        await refresh_english_vectors()
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English vectors refresh") from exc


@router.post("/generate", response_model=EnglishMaterialGenerationResult)
async def post_generate_english_material(
    payload: EnglishMaterialGenerationRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialGenerationResult:
    try:
        return await generate_english_material(payload, auth_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/complete", response_model=EnglishMaterialCompletionResult)
async def post_complete_english_material(
    payload: EnglishMaterialCompletionRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialCompletionResult:
    try:
        return await complete_english_material(payload, auth_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/complete/jobs", response_model=EnglishMaterialCompletionJobSnapshot, status_code=status.HTTP_202_ACCEPTED)
async def start_english_material_completion_job(
    payload: EnglishMaterialCompletionRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialCompletionJobSnapshot:
    fingerprint = _completion_fingerprint(payload)
    for job in _completion_jobs.values():
        if job.owner_username == auth_context.username and job.fingerprint == fingerprint and job.status == "running":
            return _snapshot_completion_job(job)

    job = EnglishMaterialCompletionJobState(
        job_id=uuid4().hex,
        owner_username=auth_context.username,
        fingerprint=fingerprint,
        payload=payload,
    )
    _completion_jobs[job.job_id] = job
    task = asyncio.create_task(_run_english_material_completion_job(job, auth_context))
    _completion_job_tasks[job.job_id] = task
    task.add_done_callback(lambda _: _completion_job_tasks.pop(job.job_id, None))
    logger.info(
        "English material completion job started id=%s provider=%s model=%s script_chars=%d",
        job.job_id,
        payload.execution_provider,
        payload.model_name or "default",
        len(payload.full_script),
    )
    return _snapshot_completion_job(job)


@router.get("/complete/jobs/{job_id}", response_model=EnglishMaterialCompletionJobSnapshot)
async def get_english_material_completion_job(
    job_id: str,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialCompletionJobSnapshot:
    return _snapshot_completion_job(_get_owned_completion_job(job_id, auth_context))


@router.delete("/complete/jobs/{job_id}", response_model=EnglishMaterialCompletionJobSnapshot)
async def cancel_english_material_completion_job(
    job_id: str,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialCompletionJobSnapshot:
    job = _get_owned_completion_job(job_id, auth_context)
    if job.status != "running":
        return _snapshot_completion_job(job)

    job.status = "cancelled"
    job.error_message = "AI 补全已取消。"
    job.completed_at = datetime.now(UTC)
    task = _completion_job_tasks.get(job.job_id)
    if task is not None and not task.done():
        task.cancel()
    logger.info("English material completion job cancelled id=%s", job.job_id)
    return _snapshot_completion_job(job)


async def _run_english_material_completion_job(job: EnglishMaterialCompletionJobState, auth_context: AuthContext) -> None:
    try:
        result = await asyncio.wait_for(
            complete_english_material(job.payload, auth_context),
            timeout=COMPLETION_JOB_TIMEOUT_SECONDS,
        )
        if job.status == "running":
            job.status = "completed"
            job.result = result
            job.completed_at = datetime.now(UTC)
            logger.info("English material completion job completed id=%s elapsed_ms=%d", job.job_id, _completion_elapsed_ms(job))
    except asyncio.CancelledError:
        # The cancellation endpoint has already supplied the user-facing state.
        raise
    except asyncio.TimeoutError as exc:
        _fail_completion_job(job, "AI 补全超时，请稍后重试。", exc)
    except Exception as exc:
        _fail_completion_job(job, str(exc) or "AI 补全失败，请稍后重试。", exc)


def _fail_completion_job(job: EnglishMaterialCompletionJobState, message: str, exc: Exception) -> None:
    if job.status != "running":
        return
    job.status = "failed"
    job.error_message = message
    job.completed_at = datetime.now(UTC)
    logger.warning("English material completion job failed id=%s elapsed_ms=%d error=%s", job.job_id, _completion_elapsed_ms(job), exc)


def _get_owned_completion_job(job_id: str, auth_context: AuthContext) -> EnglishMaterialCompletionJobState:
    job = _completion_jobs.get(job_id)
    if job is None or job.owner_username != auth_context.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI 补全任务不存在或已因服务重启丢失，请重新发起补全。")
    return job


def _snapshot_completion_job(job: EnglishMaterialCompletionJobState) -> EnglishMaterialCompletionJobSnapshot:
    return EnglishMaterialCompletionJobSnapshot(
        job_id=job.job_id,
        status=job.status,  # type: ignore[arg-type]
        execution_provider=job.payload.execution_provider,
        model_name=job.payload.model_name,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at.isoformat(),
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


def _completion_fingerprint(payload: EnglishMaterialCompletionRequest) -> str:
    value = json.dumps(payload.model_dump(mode="json"), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _completion_elapsed_ms(job: EnglishMaterialCompletionJobState) -> int:
    return round((datetime.now(UTC) - job.started_at).total_seconds() * 1000)


@router.get("/{material_id}", response_model=EnglishMaterialItem)
async def get_english_material_detail(
    material_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        item = await get_english_material(material_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English material detail query") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="English material not found")

    return EnglishMaterialItem.model_validate(item)


@router.post("", response_model=EnglishMaterialItem, status_code=status.HTTP_201_CREATED)
async def post_english_material(
    payload: EnglishMaterialCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        created = await create_english_material(payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English material insert") from exc

    return EnglishMaterialItem.model_validate(created)


@router.patch("/{material_id}", response_model=EnglishMaterialItem)
async def patch_english_material(
    material_id: int,
    payload: EnglishMaterialUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        updated = await update_english_material(material_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English material update") from exc

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="English material not found")

    return EnglishMaterialItem.model_validate(updated)
