import oracledb
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.errors import oracle_http_exception
from app.core.security import require_api_key, require_current_user
from app.db.oracle import acquire_connection
from app.repositories.history_ask import ask_history
from app.repositories.users import AuthContext
from app.repositories.llm_config import create_llm_model_config, delete_llm_model_config, ensure_llm_config_table, list_llm_model_configs, update_llm_model_config
from app.schemas.history_ask import HistoryAskDomain, HistoryAskDomainListResponse, HistoryAskRequest, HistoryAskResponse
from app.schemas.llm_config import LlmModelConfigInput, LlmModelConfigListResponse, LlmModelConfigResponse


router = APIRouter(prefix="/history-ask", tags=["history-ask"], dependencies=[Depends(require_api_key)])

DOMAINS = [
    HistoryAskDomain(code="history", name="历史工作记录", description="基于工作记录、类型、周期和学习等级。", source_tables=["T_HISTORY", "TK_USERS"]),
    HistoryAskDomain(code="todos", name="待办事项", description="基于待办标题、内容、状态、标签和来源。", source_tables=["AI_TODO_ITEMS", "TK_USERS"]),
    HistoryAskDomain(code="knowledge", name="可信知识", description="基于知识问答、来源、主题标签和发布状态。", source_tables=["AI_QA_LIB", "TK_USERS"]),
    HistoryAskDomain(code="english_materials", name="英语素材", description="基于英语表达、职业句式、中文翻译、分类和标记状态。", source_tables=["T_ENGLISH", "TK_USERS"]),
]


@router.get("/domains", response_model=HistoryAskDomainListResponse)
async def get_history_ask_domains() -> HistoryAskDomainListResponse:
    return HistoryAskDomainListResponse(items=DOMAINS)


@router.get("/llm-configs", response_model=LlmModelConfigListResponse)
async def list_llm_configs() -> LlmModelConfigListResponse:
    try:
        async with acquire_connection() as connection:
            await ensure_llm_config_table(connection)
            configs = await list_llm_model_configs(connection)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the LLM config query") from exc

    return LlmModelConfigListResponse(items=[LlmModelConfigResponse(**config) for config in configs])


@router.post("/llm-configs", response_model=LlmModelConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_config(payload: LlmModelConfigInput) -> LlmModelConfigResponse:
    try:
        async with acquire_connection() as connection:
            config = await create_llm_model_config(connection, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the LLM config update") from exc

    return LlmModelConfigResponse(**config)


@router.put("/llm-configs/{model_config_id}", response_model=LlmModelConfigResponse)
async def put_llm_config(model_config_id: int, payload: LlmModelConfigInput) -> LlmModelConfigResponse:
    try:
        async with acquire_connection() as connection:
            config = await update_llm_model_config(connection, model_config_id, payload.model_dump())
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the LLM config update") from exc
    return LlmModelConfigResponse(**config)


@router.delete("/llm-configs/{model_config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_llm_config(model_config_id: int) -> None:
    try:
        async with acquire_connection() as connection:
            await delete_llm_model_config(connection, model_config_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the LLM config deletion") from exc


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
