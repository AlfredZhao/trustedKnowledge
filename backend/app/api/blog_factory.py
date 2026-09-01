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
from app.repositories.blog_factory import (
    BlogFactoryItemNotPendingError,
    create_blog_factory_item,
    delete_blog_factory_item,
    get_blog_factory_item,
    list_blog_factory_items,
    refresh_blog_factory_vectors,
    send_blog_factory_item_to_processing,
    update_blog_factory_article,
    update_blog_factory_content_status,
    update_blog_factory_item,
    update_blog_factory_status,
)
from app.repositories.blog_review import BlogReviewTimeoutError, review_blog_factory_content
from app.repositories.blog_enhancement import enhance_blog_factory_content
from app.repositories.blog_publish import (
    BlogFactoryPublishTargetNotFoundError,
    BlogPublishConfigNotFoundError,
    create_blog_publish_config,
    delete_blog_publish_config,
    list_blog_publish_categories,
    list_blog_publish_configs,
    publish_blog_factory_article,
    update_blog_publish_config,
    validate_blog_publish_config,
)
from app.repositories.users import AuthContext
from app.schemas.blog_factory import (
    BlogFactoryArticleUpdate,
    BlogFactoryContentStatusUpdate,
    BlogFactoryCreate,
    BlogFactoryEnhancementRequest,
    BlogFactoryEnhancementResult,
    BlogFactoryItem,
    BlogFactoryListResponse,
    BlogFactoryReviewRequest,
    BlogFactoryReviewJobSnapshot,
    BlogFactoryReviewResult,
    BlogFactorySendToProcessing,
    BlogFactorySendToProcessingResult,
    BlogFactoryStatusUpdate,
    BlogFactoryUpdate,
)
from app.schemas.blog_publish import (
    BlogFactoryPublishRequest,
    BlogFactoryPublishResponse,
    BlogPublishConfig,
    BlogPublishCategoryListResponse,
    BlogPublishConfigCreate,
    BlogPublishConfigListResponse,
    BlogPublishConfigUpdate,
    BlogPublishConfigValidationRequest,
    BlogPublishConfigValidationResponse,
)
from app.schemas.knowledge import KnowledgeItem
from app.services.metaweblog import MetaWeblogError


router = APIRouter(prefix="/blog-factory", tags=["blog-factory"])
logger = logging.getLogger(__name__)
REVIEW_JOB_TIMEOUT_SECONDS = 100


@dataclass
class BlogFactoryReviewJobState:
    job_id: str
    owner_username: str
    fingerprint: str
    payload: BlogFactoryReviewRequest
    status: str = "running"
    result: BlogFactoryReviewResult | None = None
    error_message: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None


_review_jobs: dict[str, BlogFactoryReviewJobState] = {}
_review_job_tasks: dict[str, asyncio.Task[None]] = {}


@router.post("/enhance", response_model=BlogFactoryEnhancementResult)
async def post_enhance_blog_factory_content(
    payload: BlogFactoryEnhancementRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryEnhancementResult:
    try:
        return await enhance_blog_factory_content(payload, auth_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/review", response_model=BlogFactoryReviewResult)
async def post_review_blog_factory_content(
    payload: BlogFactoryReviewRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryReviewResult:
    try:
        return await review_blog_factory_content(payload, auth_context)
    except BlogReviewTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/review/jobs", response_model=BlogFactoryReviewJobSnapshot, status_code=status.HTTP_202_ACCEPTED)
async def start_blog_factory_review_job(
    payload: BlogFactoryReviewRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryReviewJobSnapshot:
    fingerprint = _review_fingerprint(payload)
    for job in _review_jobs.values():
        if job.owner_username == auth_context.username and job.fingerprint == fingerprint and job.status == "running":
            return _snapshot_review_job(job)

    job = BlogFactoryReviewJobState(
        job_id=uuid4().hex,
        owner_username=auth_context.username,
        fingerprint=fingerprint,
        payload=payload,
    )
    _review_jobs[job.job_id] = job
    task = asyncio.create_task(_run_blog_factory_review_job(job, auth_context))
    _review_job_tasks[job.job_id] = task
    task.add_done_callback(lambda _: _review_job_tasks.pop(job.job_id, None))
    logger.info(
        "Blog review job started id=%s provider=%s model=%s task_chars=%d",
        job.job_id,
        payload.execution_provider,
        payload.model_name or "default",
        len(payload.task_content),
    )
    return _snapshot_review_job(job)


@router.get("/review/jobs/{job_id}", response_model=BlogFactoryReviewJobSnapshot)
async def get_blog_factory_review_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> BlogFactoryReviewJobSnapshot:
    job = _get_owned_review_job(job_id, auth_context)
    return _snapshot_review_job(job)


@router.delete("/review/jobs/{job_id}", response_model=BlogFactoryReviewJobSnapshot)
async def cancel_blog_factory_review_job(job_id: str, auth_context: AuthContext = Depends(require_current_user)) -> BlogFactoryReviewJobSnapshot:
    job = _get_owned_review_job(job_id, auth_context)
    if job.status != "running":
        return _snapshot_review_job(job)

    job.status = "cancelled"
    job.error_message = "审阅已取消。"
    job.completed_at = datetime.now(UTC)
    task = _review_job_tasks.get(job.job_id)
    if task is not None and not task.done():
        task.cancel()
    logger.info("Blog review job cancelled id=%s", job.job_id)
    return _snapshot_review_job(job)


async def _run_blog_factory_review_job(job: BlogFactoryReviewJobState, auth_context: AuthContext) -> None:
    try:
        result = await asyncio.wait_for(
            review_blog_factory_content(job.payload, auth_context),
            timeout=REVIEW_JOB_TIMEOUT_SECONDS,
        )
        if job.status == "running":
            job.status = "completed"
            job.result = result
            job.completed_at = datetime.now(UTC)
            logger.info("Blog review job completed id=%s elapsed_ms=%d", job.job_id, _review_elapsed_ms(job))
    except asyncio.CancelledError:
        # The cancellation endpoint has already supplied the user-facing state.
        raise
    except (asyncio.TimeoutError, BlogReviewTimeoutError) as exc:
        _fail_review_job(job, "AI 审阅超时，请稍后重试。", exc)
    except Exception as exc:
        _fail_review_job(job, str(exc) or "AI 审阅失败，请稍后重试。", exc)


def _fail_review_job(job: BlogFactoryReviewJobState, message: str, exc: Exception) -> None:
    if job.status != "running":
        return
    job.status = "failed"
    job.error_message = message
    job.completed_at = datetime.now(UTC)
    logger.warning("Blog review job failed id=%s elapsed_ms=%d error=%s", job.job_id, _review_elapsed_ms(job), exc)


def _get_owned_review_job(job_id: str, auth_context: AuthContext) -> BlogFactoryReviewJobState:
    job = _review_jobs.get(job_id)
    if job is None or job.owner_username != auth_context.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审阅任务不存在或已因服务重启丢失，请重新发起审阅。")
    return job


def _snapshot_review_job(job: BlogFactoryReviewJobState) -> BlogFactoryReviewJobSnapshot:
    return BlogFactoryReviewJobSnapshot(
        job_id=job.job_id,
        status=job.status,  # type: ignore[arg-type]
        execution_provider=job.payload.execution_provider,
        model_name=job.payload.model_name,
        result=job.result,
        error_message=job.error_message,
        started_at=job.started_at.isoformat(),
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


def _review_fingerprint(payload: BlogFactoryReviewRequest) -> str:
    value = json.dumps(payload.model_dump(mode="json"), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _review_elapsed_ms(job: BlogFactoryReviewJobState) -> int:
    return round((datetime.now(UTC) - job.started_at).total_seconds() * 1000)


@router.get("", response_model=BlogFactoryListResponse)
async def get_blog_factory_items(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    semantic_query: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    factory_status: Literal["待处理", "已处理", "已发布", "跳过"] | None = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    knowledge_id: Annotated[int | None, Query(ge=1)] = None,
    v_needs_update: Annotated[int | None, Query(ge=0, le=1)] = None,
    sort_by: Literal["copied_at", "id", "knowledge_id", "factory_status"] = "copied_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryListResponse:
    try:
        items, total = await list_blog_factory_items(
            limit=limit,
            offset=offset,
            q=q,
            semantic_query=semantic_query,
            username=username,
            factory_status=factory_status,
            topic=topic,
            knowledge_id=knowledge_id,
            v_needs_update=v_needs_update,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory query") from exc

    return BlogFactoryListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/refresh-vectors", status_code=status.HTTP_204_NO_CONTENT)
async def post_refresh_blog_factory_vectors(_: AuthContext = Depends(require_admin_user)) -> None:
    try:
        await refresh_blog_factory_vectors()
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the Blog Factory vectors refresh") from exc


@router.post("", response_model=BlogFactoryItem, status_code=status.HTTP_201_CREATED)
async def post_blog_factory_item(
    payload: BlogFactoryCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        created = await create_blog_factory_item(payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory entry") from exc

    if created is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")

    return BlogFactoryItem.model_validate(created)


@router.get("/publish-configs", response_model=BlogPublishConfigListResponse)
async def get_blog_publish_configs(
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogPublishConfigListResponse:
    try:
        items = await list_blog_publish_configs(auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish config query") from exc
    return BlogPublishConfigListResponse(items=[BlogPublishConfig.model_validate(item) for item in items], total=len(items))


@router.post("/publish-configs", response_model=BlogPublishConfig, status_code=status.HTTP_201_CREATED)
async def post_blog_publish_config(
    payload: BlogPublishConfigCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogPublishConfig:
    try:
        created = await create_blog_publish_config(payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish config creation") from exc
    return BlogPublishConfig.model_validate(created)


@router.patch("/publish-configs/{config_id}", response_model=BlogPublishConfig)
async def patch_blog_publish_config(
    config_id: int,
    payload: BlogPublishConfigUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogPublishConfig:
    try:
        updated = await update_blog_publish_config(config_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish config update") from exc
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog publish config not found")
    return BlogPublishConfig.model_validate(updated)


@router.delete("/publish-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_publish_config_detail(
    config_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> None:
    try:
        deleted = await delete_blog_publish_config(config_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish config deletion") from exc
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog publish config not found")


@router.post("/publish-configs/validate", response_model=BlogPublishConfigValidationResponse)
async def post_blog_publish_config_validation(
    payload: BlogPublishConfigValidationRequest,
    _: AuthContext = Depends(require_current_user),
) -> BlogPublishConfigValidationResponse:
    try:
        result = await validate_blog_publish_config(
            blog_url=payload.blog_url,
            username=payload.username,
            password=payload.password,
            api_url=payload.api_url,
            blog_name=payload.blog_name,
        )
    except MetaWeblogError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return BlogPublishConfigValidationResponse.model_validate(result)


@router.get("/publish-configs/{config_id}/categories", response_model=BlogPublishCategoryListResponse)
async def get_blog_publish_categories(
    config_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogPublishCategoryListResponse:
    try:
        items = await list_blog_publish_categories(config_id, auth_context)
    except BlogPublishConfigNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog publish config not found") from exc
    except MetaWeblogError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish category query") from exc
    return BlogPublishCategoryListResponse.model_validate({"items": items, "total": len(items)})


@router.get("/{item_id}", response_model=BlogFactoryItem)
async def get_blog_factory_item_detail(
    item_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await get_blog_factory_item(item_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory detail query") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.patch("/{item_id}", response_model=BlogFactoryItem)
async def patch_blog_factory_item(
    item_id: int,
    payload: BlogFactoryUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_item(item_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory item update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.patch("/{item_id}/status", response_model=BlogFactoryItem)
async def patch_blog_factory_status(
    item_id: int,
    payload: BlogFactoryStatusUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_status(item_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory status update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.patch("/{item_id}/content-status", response_model=BlogFactoryItem)
async def patch_blog_factory_content_status(
    item_id: int,
    payload: BlogFactoryContentStatusUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_content_status(item_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory content status update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.post("/{item_id}/send-to-processing", response_model=BlogFactorySendToProcessingResult)
async def post_blog_factory_send_to_processing(
    item_id: int,
    payload: BlogFactorySendToProcessing,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactorySendToProcessingResult:
    try:
        result = await send_blog_factory_item_to_processing(item_id, payload, auth_context)
    except BlogFactoryItemNotPendingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory send-back") from exc

    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    item, knowledge = result
    return BlogFactorySendToProcessingResult(
        item=BlogFactoryItem.model_validate(item),
        knowledge=KnowledgeItem.model_validate(knowledge),
    )


@router.patch("/{item_id}/article", response_model=BlogFactoryItem)
async def patch_blog_factory_article(
    item_id: int,
    payload: BlogFactoryArticleUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_article(item_id, payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory article update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_factory_item_detail(
    item_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> None:
    try:
        deleted = await delete_blog_factory_item(item_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog factory deletion") from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")


@router.post("/{item_id}/publish", response_model=BlogFactoryPublishResponse)
async def post_blog_factory_publish(
    item_id: int,
    payload: BlogFactoryPublishRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryPublishResponse:
    try:
        result = await publish_blog_factory_article(item_id, payload, auth_context)
    except BlogPublishConfigNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog publish config not found") from exc
    except BlogFactoryPublishTargetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found") from exc
    except MetaWeblogError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the blog publish request") from exc
    return BlogFactoryPublishResponse.model_validate(result)
