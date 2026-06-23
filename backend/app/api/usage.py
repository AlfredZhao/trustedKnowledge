from typing import Annotated

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_admin_module
from app.repositories.usage import list_llm_usage
from app.schemas.usage import LlmUsageResponse


router = APIRouter(prefix="/llm-usage", tags=["llm-usage"], dependencies=[Depends(require_admin_module("usage"))])


@router.get("", response_model=LlmUsageResponse)
async def get_llm_usage(
    limit: Annotated[int, Query(ge=1, le=240)] = 72,
) -> LlmUsageResponse:
    try:
        items, total = await list_llm_usage(limit=limit)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the LLM usage query: {message}",
        ) from exc

    return LlmUsageResponse(items=items, total=total)
