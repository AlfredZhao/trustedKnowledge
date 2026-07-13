from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_current_user
from app.repositories.conversions import convert_todo_to_knowledge
from app.repositories.current_records import prepend_todo_to_current_content
from app.repositories.todos import TodoUpdateLocked, create_todo, get_todo_by_id, list_todos, update_todo
from app.repositories.users import AuthContext
from app.schemas.current_records import CurrentRecordItem
from app.schemas.knowledge import KnowledgeItem
from app.schemas.todos import TodoCreate, TodoCurrentAppendTarget, TodoItem, TodoListResponse, TodoUpdate


router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=TodoListResponse)
async def get_todos(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    include_total: bool = True,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    status_filter: Annotated[
        Literal["待处理", "处理中", "已完成"] | None,
        Query(alias="status"),
    ] = None,
    auth_context: AuthContext = Depends(require_current_user),
) -> TodoListResponse:
    try:
        items, total = await list_todos(
            limit=limit,
            offset=offset,
            include_total=include_total,
            q=q,
            username=username,
            todo_status=status_filter,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the todo query") from exc

    return TodoListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=TodoItem, status_code=status.HTTP_201_CREATED)
async def post_todo(payload: TodoCreate, auth_context: AuthContext = Depends(require_current_user)) -> TodoItem:
    try:
        created = await create_todo(payload, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the todo entry") from exc

    return TodoItem.model_validate(created)


@router.post("/{todo_id}/convert-to-knowledge", response_model=KnowledgeItem, status_code=status.HTTP_201_CREATED)
async def post_todo_convert_to_knowledge(
    todo_id: Annotated[int, Path(ge=1)],
    auth_context: AuthContext = Depends(require_current_user),
) -> KnowledgeItem:
    try:
        converted = await convert_todo_to_knowledge(todo_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the todo conversion") from exc

    if converted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return KnowledgeItem.model_validate(converted)


@router.post("/{todo_id}/append-to-current", response_model=CurrentRecordItem)
async def post_todo_append_to_current(
    todo_id: Annotated[int, Path(ge=1)],
    payload: TodoCurrentAppendTarget,
    auth_context: AuthContext = Depends(require_current_user),
) -> CurrentRecordItem:
    try:
        todo = await get_todo_by_id(todo_id, auth_context)
        if todo is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

        updated = await prepend_todo_to_current_content(
            username=payload.username,
            current_type=payload.type,
            week=payload.week,
            day=payload.day,
            replace_existing_content=payload.replace_existing_content,
            todo_title=todo["title"],
            todo_content=todo["content"],
            auth_context=auth_context,
        )
    except HTTPException:
        raise
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the current record append") from exc

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current record not found")

    return CurrentRecordItem.model_validate(updated)


@router.get("/{todo_id}", response_model=TodoItem)
async def get_todo_detail(
    todo_id: Annotated[int, Path(ge=1)],
    auth_context: AuthContext = Depends(require_current_user),
) -> TodoItem:
    try:
        item = await get_todo_by_id(todo_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the todo detail query") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return TodoItem.model_validate(item)


@router.patch("/{todo_id}", response_model=TodoItem)
async def patch_todo(
    todo_id: Annotated[int, Path(ge=1)],
    payload: TodoUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> TodoItem:
    try:
        item = await update_todo(todo_id, payload, auth_context)
    except TodoUpdateLocked as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the todo update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo item not found")

    return TodoItem.model_validate(item)
