import oracledb
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_api_key
from app.repositories.history_ask import ask_history
from app.schemas.history_ask import HistoryAskRequest, HistoryAskResponse


router = APIRouter(prefix="/history-ask", tags=["history-ask"], dependencies=[Depends(require_api_key)])


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
