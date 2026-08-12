import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_api_key, require_current_user
from app.db.oracle import acquire_connection
from app.repositories.history_ontology import (
    HistoryOntologyNotFoundError,
    create_history_ontology_term,
    delete_history_ontology_term,
    list_history_ontology_terms,
    update_history_ontology_term,
)
from app.repositories.users import AuthContext
from app.schemas.history_ontology import (
    HistoryOntologyListResponse,
    HistoryOntologyTerm,
    HistoryOntologyTermCreate,
    HistoryOntologyTermUpdate,
)


router = APIRouter(prefix="/history-ask/ontology", tags=["history-ontology"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=HistoryOntologyListResponse)
async def get_history_ontology(
    domain_code: str = Query("history", pattern="^(history|todos)$"),
    auth_context: AuthContext = Depends(require_current_user),
) -> HistoryOntologyListResponse:
    try:
        async with acquire_connection() as connection:
            items = await list_history_ontology_terms(connection, auth_context, domain_code)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the ontology query") from exc
    return HistoryOntologyListResponse(items=items)


@router.post("", response_model=HistoryOntologyTerm, status_code=status.HTTP_201_CREATED)
async def post_history_ontology(
    payload: HistoryOntologyTermCreate, auth_context: AuthContext = Depends(require_current_user)
) -> HistoryOntologyTerm:
    try:
        async with acquire_connection() as connection:
            return HistoryOntologyTerm.model_validate(await create_history_ontology_term(connection, payload.model_dump(), auth_context))
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the ontology create") from exc


@router.put("/{term_id}", response_model=HistoryOntologyTerm)
async def put_history_ontology(
    term_id: int, payload: HistoryOntologyTermUpdate, auth_context: AuthContext = Depends(require_current_user)
) -> HistoryOntologyTerm:
    try:
        async with acquire_connection() as connection:
            return HistoryOntologyTerm.model_validate(await update_history_ontology_term(connection, term_id, payload.model_dump(), auth_context))
    except HistoryOntologyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the ontology update") from exc


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_ontology(
    term_id: int, auth_context: AuthContext = Depends(require_current_user)
) -> None:
    try:
        async with acquire_connection() as connection:
            await delete_history_ontology_term(connection, term_id, auth_context)
    except HistoryOntologyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the ontology delete") from exc
