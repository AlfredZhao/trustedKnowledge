from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_api_key
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
from app.schemas.blog_factory import (
    BlogFactoryArticleUpdate,
    BlogFactoryContentStatusUpdate,
    BlogFactoryCreate,
    BlogFactoryItem,
    BlogFactoryListResponse,
    BlogFactoryStatusUpdate,
    BlogFactoryUpdate,
)


router = APIRouter(prefix="/blog-factory", tags=["blog-factory"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=BlogFactoryListResponse)
async def get_blog_factory_items(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    factory_status: Literal["待处理", "已处理", "已发布", "跳过"] | None = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    knowledge_id: Annotated[int | None, Query(ge=1)] = None,
    sort_by: Literal["copied_at", "id", "knowledge_id", "factory_status"] = "copied_at",
    sort_dir: Literal["asc", "desc"] = "desc",
) -> BlogFactoryListResponse:
    try:
        items, total = await list_blog_factory_items(
            limit=limit,
            offset=offset,
            q=q,
            factory_status=factory_status,
            topic=topic,
            knowledge_id=knowledge_id,
            sort_by=sort_by,
            sort_dir=sort_dir,
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
async def post_blog_factory_item(payload: BlogFactoryCreate) -> BlogFactoryItem:
    try:
        created = await create_blog_factory_item(payload)
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


@router.get("/{item_id}", response_model=BlogFactoryItem)
async def get_blog_factory_item_detail(item_id: int) -> BlogFactoryItem:
    try:
        item = await get_blog_factory_item(item_id)
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
async def patch_blog_factory_item(item_id: int, payload: BlogFactoryUpdate) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_item(item_id, payload)
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
async def patch_blog_factory_status(item_id: int, payload: BlogFactoryStatusUpdate) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_status(item_id, payload)
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
async def patch_blog_factory_content_status(item_id: int, payload: BlogFactoryContentStatusUpdate) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_content_status(item_id, payload)
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
async def patch_blog_factory_article(item_id: int, payload: BlogFactoryArticleUpdate) -> BlogFactoryItem:
    try:
        item = await update_blog_factory_article(item_id, payload)
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
async def delete_blog_factory_item_detail(item_id: int) -> None:
    try:
        deleted = await delete_blog_factory_item(item_id)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory deletion: {message}",
        ) from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog factory item not found")
