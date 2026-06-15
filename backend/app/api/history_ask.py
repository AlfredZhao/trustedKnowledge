import oracledb
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_api_key
from app.db.oracle import acquire_connection
from app.repositories.history_ask import ask_history
from app.repositories.llm_config import (
    ensure_llm_config_table,
    get_history_ask_llm_config,
    update_history_ask_llm_config,
)
from app.schemas.history_ask import HistoryAskRequest, HistoryAskResponse
from app.schemas.llm_config import LlmConfigResponse, LlmConfigUpdate


router = APIRouter(prefix="/history-ask", tags=["history-ask"], dependencies=[Depends(require_api_key)])


@router.get("/llm-config", response_model=LlmConfigResponse)
async def get_llm_config() -> LlmConfigResponse:
    try:
        async with acquire_connection() as connection:
            await ensure_llm_config_table(connection)
            config = await get_history_ask_llm_config(connection)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the LLM config query: {message}",
        ) from exc

    return LlmConfigResponse(
        provider_name=config["provider_name"],
        base_url=config["base_url"],
        model_name=config["model_name"],
        enabled=config["enabled"],
        has_api_key=config["has_api_key"],
    )


@router.put("/llm-config", response_model=LlmConfigResponse)
async def put_llm_config(payload: LlmConfigUpdate) -> LlmConfigResponse:
    try:
        async with acquire_connection() as connection:
            config = await update_history_ask_llm_config(connection, payload.model_dump())
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the LLM config update: {message}",
        ) from exc

    return LlmConfigResponse(
        provider_name=config["provider_name"],
        base_url=config["base_url"],
        model_name=config["model_name"],
        enabled=config["enabled"],
        has_api_key=config["has_api_key"],
    )


@router.post("", response_model=HistoryAskResponse)
async def post_history_ask(payload: HistoryAskRequest) -> HistoryAskResponse:
    try:
        result = await ask_history(payload.question.strip())
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the history ask query: {message}",
        ) from exc

    return HistoryAskResponse.model_validate(result)
