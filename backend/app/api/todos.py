from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.security import require_api_key
from app.repositories.conversions import convert_todo_to_knowledge
from app.repositories.todos import create_todo, get_todo_by_id, list_todos, update_todo
from app.schemas.knowledge import KnowledgeItem
from app.schemas.todos import TodoCreate, TodoItem, TodoListResponse, TodoUpdate


router = APIRouter(prefix="/todos", tags=["todos"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=TodoListResponse)
async def get_todos(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    status_filter: Annotated[
        Literal["待处理", "处理中", "已完成"] | None,
        Query(alias="status"),
    ] = None,
) -> TodoListResponse:
    try:
        items, total = await list_todos(
            limit=limit,
            offset=offset,
            q=q,
            todo_status=status_filter,
        )
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the todo query: {message}",
        ) from exc

    return TodoListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=TodoItem, status_code=status.HTTP_201_CREATED)
async def post_todo(payload: TodoCreate) -> TodoItem:
    try:
        created = await create_todo(payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the todo entry: {message}",
        ) from exc

    return TodoItem.model_validate(created)


@router.post("/{todo_id}/convert-to-knowledge", response_model=KnowledgeItem, status_code=status.HTTP_201_CREATED)
async def post_todo_convert_to_knowledge(todo_id: Annotated[int, Path(ge=1)]) -> KnowledgeItem:
    try:
        converted = await convert_todo_to_knowledge(todo_id)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the todo conversion: {message}",
        ) from exc

    if converted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return KnowledgeItem.model_validate(converted)


@router.get("/{todo_id}", response_model=TodoItem)
async def get_todo_detail(todo_id: Annotated[int, Path(ge=1)]) -> TodoItem:
    try:
        item = await get_todo_by_id(todo_id)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the todo detail query: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return TodoItem.model_validate(item)


@router.patch("/{todo_id}", response_model=TodoItem)
async def patch_todo(todo_id: Annotated[int, Path(ge=1)], payload: TodoUpdate) -> TodoItem:
    try:
        item = await update_todo(todo_id, payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the todo update: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return TodoItem.model_validate(item)
