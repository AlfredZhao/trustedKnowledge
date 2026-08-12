import oracledb
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.errors import oracle_http_exception
from app.core.security import require_api_key, require_current_user
from app.db.oracle import acquire_connection
from app.repositories.history_ask import ask_history
from app.repositories.users import AuthContext
from app.repositories.llm_config import (
    ensure_llm_config_table,
    get_history_ask_llm_config,
    update_history_ask_llm_config,
)
from app.schemas.history_ask import HistoryAskDomain, HistoryAskDomainListResponse, HistoryAskRequest, HistoryAskResponse
from app.schemas.llm_config import LlmConfigResponse, LlmConfigUpdate


router = APIRouter(prefix="/history-ask", tags=["history-ask"], dependencies=[Depends(require_api_key)])

DOMAINS = [
    HistoryAskDomain(code="history", name="历史工作记录", description="基于工作记录、类型、周期和学习等级。", source_tables=["T_HISTORY", "TK_USERS"]),
    HistoryAskDomain(code="todos", name="待办事项", description="基于待办标题、内容、状态、标签和来源。", source_tables=["AI_TODO_ITEMS", "TK_USERS"]),
]


@router.get("/domains", response_model=HistoryAskDomainListResponse)
async def get_history_ask_domains() -> HistoryAskDomainListResponse:
    return HistoryAskDomainListResponse(items=DOMAINS)


@router.get("/llm-config", response_model=LlmConfigResponse)
async def get_llm_config() -> LlmConfigResponse:
    try:
        async with acquire_connection() as connection:
            await ensure_llm_config_table(connection)
            config = await get_history_ask_llm_config(connection)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the LLM config query") from exc

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
        raise oracle_http_exception(exc, "Oracle rejected the LLM config update") from exc

    return LlmConfigResponse(
        provider_name=config["provider_name"],
        base_url=config["base_url"],
        model_name=config["model_name"],
        enabled=config["enabled"],
        has_api_key=config["has_api_key"],
    )


@router.post("", response_model=HistoryAskResponse)
async def post_history_ask(
    payload: HistoryAskRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> HistoryAskResponse:
    try:
        result = await ask_history(
            payload.question.strip(),
            skill_ids=payload.skill_ids,
            execution_provider=payload.execution_provider,
            model_name=payload.model_name,
            domain_code=payload.domain_code,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the history ask query") from exc

    return HistoryAskResponse.model_validate(result)
