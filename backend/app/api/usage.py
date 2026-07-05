from typing import Annotated

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import oracle_http_exception
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
        raise oracle_http_exception(exc, "Oracle rejected the LLM usage query") from exc

    return LlmUsageResponse(items=items, total=total)
