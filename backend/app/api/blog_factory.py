from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_current_user
from app.repositories.blog_factory import (
    create_blog_factory_item,
    delete_blog_factory_item,
    get_blog_factory_item,
    list_blog_factory_items,
    update_blog_factory_article,
    update_blog_factory_content_status,
    update_blog_factory_item,
    update_blog_factory_status,
)
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
    BlogFactoryItem,
    BlogFactoryListResponse,
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
from app.services.metaweblog import MetaWeblogError


router = APIRouter(prefix="/blog-factory", tags=["blog-factory"])


@router.get("", response_model=BlogFactoryListResponse)
async def get_blog_factory_items(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    factory_status: Literal["待处理", "已处理", "已发布", "跳过"] | None = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    knowledge_id: Annotated[int | None, Query(ge=1)] = None,
    sort_by: Literal["copied_at", "id", "knowledge_id", "factory_status"] = "copied_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryListResponse:
    try:
        items, total = await list_blog_factory_items(
            limit=limit,
            offset=offset,
            q=q,
            username=username,
            factory_status=factory_status,
            topic=topic,
            knowledge_id=knowledge_id,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory query: {message}",
        ) from exc

    return BlogFactoryListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=BlogFactoryItem, status_code=status.HTTP_201_CREATED)
async def post_blog_factory_item(
    payload: BlogFactoryCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        created = await create_blog_factory_item(payload, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory entry: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish config query: {message}",
        ) from exc
    return BlogPublishConfigListResponse(items=[BlogPublishConfig.model_validate(item) for item in items], total=len(items))


@router.post("/publish-configs", response_model=BlogPublishConfig, status_code=status.HTTP_201_CREATED)
async def post_blog_publish_config(
    payload: BlogPublishConfigCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogPublishConfig:
    try:
        created = await create_blog_publish_config(payload, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish config creation: {message}",
        ) from exc
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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish config update: {message}",
        ) from exc
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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish config deletion: {message}",
        ) from exc
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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish category query: {message}",
        ) from exc
    return BlogPublishCategoryListResponse.model_validate({"items": items, "total": len(items)})


@router.get("/{item_id}", response_model=BlogFactoryItem)
async def get_blog_factory_item_detail(
    item_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await get_blog_factory_item(item_id, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory detail query: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory item update: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory status update: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory content status update: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")

    return BlogFactoryItem.model_validate(item)


@router.patch("/{item_id}/article", response_model=BlogFactoryItem)
async def patch_blog_factory_article(
    item_id: int,
    payload: BlogFactoryArticleUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_article(item_id, payload, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory article update: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory deletion: {message}",
        ) from exc

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
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog publish request: {message}",
        ) from exc
    return BlogFactoryPublishResponse.model_validate(result)
