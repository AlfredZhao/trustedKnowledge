from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.security import require_api_key
from app.repositories.conversions import convert_knowledge_to_todo
from app.repositories.knowledge import (
    create_knowledge,
    delete_knowledge,
    get_knowledge_by_id,
    list_knowledge,
    merge_knowledge,
    update_knowledge,
)
from app.schemas.knowledge import (
    KnowledgeCreate,
    KnowledgeItem,
    KnowledgeListResponse,
    KnowledgeMergeRequest,
    KnowledgeUpdate,
)
from app.schemas.todos import TodoItem


router = APIRouter(prefix="/knowledge", tags=["knowledge"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=KnowledgeListResponse)
async def get_knowledge(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    source: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    status_filter: Annotated[
        Literal["未发布", "已发布", "跳过"] | None,
        Query(alias="status"),
    ] = None,
) -> KnowledgeListResponse:
    items, total = await list_knowledge(
        limit=limit,
        offset=offset,
        q=q,
        topic=topic,
        source=source,
        status=status_filter,
    )
    return KnowledgeListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=KnowledgeItem, status_code=status.HTTP_201_CREATED)
async def post_knowledge(payload: KnowledgeCreate) -> KnowledgeItem:
    try:
        created = await create_knowledge(payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the knowledge entry: {message}",
        ) from exc

    return KnowledgeItem.model_validate(created)


@router.post("/merge", response_model=KnowledgeItem, status_code=status.HTTP_201_CREATED)
async def post_knowledge_merge(payload: KnowledgeMergeRequest) -> KnowledgeItem:
    try:
        created = await merge_knowledge(payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the knowledge merge: {message}",
        ) from exc

    if created is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only existing unpublished knowledge items can be merged",
        )

    return KnowledgeItem.model_validate(created)


@router.post("/{knowledge_id}/convert-to-todo", response_model=TodoItem, status_code=status.HTTP_201_CREATED)
async def post_knowledge_convert_to_todo(
    knowledge_id: Annotated[int, Path(ge=1)],
) -> TodoItem:
    try:
        converted = await convert_knowledge_to_todo(knowledge_id)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the knowledge conversion: {message}",
        ) from exc

    if converted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")

    return TodoItem.model_validate(converted)


@router.get("/{knowledge_id}", response_model=KnowledgeItem)
async def get_knowledge_detail(
    knowledge_id: Annotated[int, Path(ge=1)],
) -> KnowledgeItem:
    item = await get_knowledge_by_id(knowledge_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")
    return KnowledgeItem.model_validate(item)


@router.patch("/{knowledge_id}", response_model=KnowledgeItem)
async def patch_knowledge(
    knowledge_id: Annotated[int, Path(ge=1)],
    payload: KnowledgeUpdate,
) -> KnowledgeItem:
    try:
        updated = await update_knowledge(knowledge_id, payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the knowledge update: {message}",
        ) from exc

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")

    return KnowledgeItem.model_validate(updated)


@router.delete("/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_item(
    knowledge_id: Annotated[int, Path(ge=1)],
) -> None:
    try:
        deleted = await delete_knowledge(knowledge_id)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the knowledge deletion: {message}",
        ) from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")
