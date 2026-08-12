import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_api_key, require_current_user
from app.db.oracle import acquire_connection
from app.repositories.history_ask_quick_questions import (
    HistoryAskQuickQuestionConflictError,
    HistoryAskQuickQuestionLimitError,
    HistoryAskQuickQuestionNotFoundError,
    create_history_ask_quick_question,
    delete_history_ask_quick_question,
    list_history_ask_quick_questions,
    update_history_ask_quick_question,
)
from app.repositories.users import AuthContext
from app.schemas.history_ask_quick_questions import (
    HistoryAskQuickQuestion,
    HistoryAskQuickQuestionCreate,
    HistoryAskQuickQuestionListResponse,
    HistoryAskQuickQuestionUpdate,
)


router = APIRouter(prefix="/history-ask/quick-questions", tags=["history-ask-quick-questions"], dependencies=[Depends(require_api_key)])
DOMAIN_PATTERN = "^(history|todos|knowledge|english_materials)$"


@router.get("", response_model=HistoryAskQuickQuestionListResponse)
async def get_quick_questions(domain_code: str = Query("history", pattern=DOMAIN_PATTERN), auth_context: AuthContext = Depends(require_current_user)) -> HistoryAskQuickQuestionListResponse:
    try:
        async with acquire_connection() as connection:
            items = await list_history_ask_quick_questions(connection, auth_context, domain_code)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the quick-question query") from exc
    return HistoryAskQuickQuestionListResponse(items=items)


@router.post("", response_model=HistoryAskQuickQuestion, status_code=status.HTTP_201_CREATED)
async def post_quick_question(payload: HistoryAskQuickQuestionCreate, auth_context: AuthContext = Depends(require_current_user)) -> HistoryAskQuickQuestion:
    try:
        async with acquire_connection() as connection:
            return HistoryAskQuickQuestion.model_validate(await create_history_ask_quick_question(connection, payload.model_dump(), auth_context))
    except HistoryAskQuickQuestionConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except HistoryAskQuickQuestionLimitError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the quick-question create") from exc


@router.put("/{item_id}", response_model=HistoryAskQuickQuestion)
async def put_quick_question(item_id: int, payload: HistoryAskQuickQuestionUpdate, auth_context: AuthContext = Depends(require_current_user)) -> HistoryAskQuickQuestion:
    try:
        async with acquire_connection() as connection:
            return HistoryAskQuickQuestion.model_validate(await update_history_ask_quick_question(connection, item_id, payload.model_dump(), auth_context))
    except HistoryAskQuickQuestionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except HistoryAskQuickQuestionConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the quick-question update") from exc


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quick_question(item_id: int, auth_context: AuthContext = Depends(require_current_user)) -> None:
    try:
        async with acquire_connection() as connection:
            await delete_history_ask_quick_question(connection, item_id, auth_context)
    except HistoryAskQuickQuestionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the quick-question delete") from exc
