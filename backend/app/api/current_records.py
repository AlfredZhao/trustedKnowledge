from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_current_user
from app.repositories.users import AuthContext
from app.repositories.current_records import (
    create_current_record,
    get_current_record,
    get_current_record_options,
    list_current_records,
    update_current_record,
)
from app.schemas.current_records import (
    CurrentRecordCreate,
    CurrentRecordItem,
    CurrentRecordListResponse,
    CurrentRecordOptions,
    CurrentRecordUpdate,
)


router = APIRouter(prefix="/current-records", tags=["current-records"])


@router.get("", response_model=CurrentRecordListResponse)
async def get_current_records(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=30)] = None,
    current_type: Annotated[str | None, Query(alias="type", min_length=1, max_length=40)] = None,
    week: Annotated[str | None, Query(pattern=r"^W([1-9]|[1-3][0-9]|4[0-8])$")] = None,
    day: Annotated[str | None, Query(pattern=r"^D[1-7]$")] = None,
    learn_level: Annotated[int | None, Query(ge=1, le=10)] = None,
    sort_by: Literal["id", "type", "week", "day", "username", "learn_level"] = "id",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> CurrentRecordListResponse:
    try:
        items, total = await list_current_records(
            limit=limit,
            offset=offset,
            q=q,
            username=username,
            current_type=current_type,
            week=week,
            day=day,
            learn_level=learn_level,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the current records query: {message}",
        ) from exc

    return CurrentRecordListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/options", response_model=CurrentRecordOptions)
async def get_current_records_options(auth_context: AuthContext = Depends(require_current_user)) -> CurrentRecordOptions:
    try:
        options = await get_current_record_options(auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the current records options query: {message}",
        ) from exc

    return CurrentRecordOptions.model_validate(options)


@router.get("/{record_id}", response_model=CurrentRecordItem)
async def get_current_record_detail(record_id: int, auth_context: AuthContext = Depends(require_current_user)) -> CurrentRecordItem:
    try:
        item = await get_current_record(record_id, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the current record detail query: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current record not found")

    return CurrentRecordItem.model_validate(item)


@router.post("", response_model=CurrentRecordItem, status_code=status.HTTP_201_CREATED)
async def post_current_record(
    payload: CurrentRecordCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> CurrentRecordItem:
    try:
        created = await create_current_record(payload, auth_context)
    except HTTPException:
        raise
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the current record insert: {message}",
        ) from exc

    return CurrentRecordItem.model_validate(created)


@router.patch("/{record_id}", response_model=CurrentRecordItem)
async def patch_current_record(
    record_id: int,
    payload: CurrentRecordUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> CurrentRecordItem:
    try:
        item = await update_current_record(record_id, payload, auth_context)
    except HTTPException:
        raise
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the current record update: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current record not found")

    return CurrentRecordItem.model_validate(item)
