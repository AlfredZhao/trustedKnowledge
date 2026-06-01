from datetime import date
from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_api_key
from app.repositories.history import list_history
from app.schemas.history import HistoryListResponse


router = APIRouter(prefix="/history", tags=["history"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=HistoryListResponse)
async def get_history(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    history_type: Annotated[str | None, Query(alias="type", min_length=1, max_length=100)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    week: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    day: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    learn_level: Annotated[int | None, Query(ge=0, le=100)] = None,
    v_needs_update: Annotated[int | None, Query(ge=0, le=1)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_by: Literal["history_date", "id", "type", "username", "learn_level"] = "history_date",
    sort_dir: Literal["asc", "desc"] = "desc",
) -> HistoryListResponse:
    try:
        items, total, summary = await list_history(
            limit=limit,
            offset=offset,
            q=q,
            history_type=history_type,
            username=username,
            week=week,
            day=day,
            learn_level=learn_level,
            v_needs_update=v_needs_update,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the history query: {message}",
        ) from exc

    return HistoryListResponse(items=items, total=total, limit=limit, offset=offset, summary=summary)
