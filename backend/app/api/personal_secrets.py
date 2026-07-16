from typing import Annotated

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_current_user
from app.repositories.personal_secrets import (
    create_personal_secret,
    delete_personal_secret,
    get_personal_secret,
    list_personal_secrets,
    reveal_personal_secret,
    update_personal_secret,
)
from app.repositories.users import AuthContext
from app.schemas.personal_secrets import (
    PersonalSecretCreate,
    PersonalSecretItem,
    PersonalSecretListResponse,
    PersonalSecretRevealRequest,
    PersonalSecretRevealResponse,
    PersonalSecretUpdate,
)
from app.services.personal_secret_crypto import PersonalSecretCryptoError


router = APIRouter(prefix="/personal-secrets", tags=["personal-secrets"])


@router.get("", response_model=PersonalSecretListResponse)
async def get_personal_secrets(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    include_total: bool = True,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    auth_context: AuthContext = Depends(require_current_user),
) -> PersonalSecretListResponse:
    try:
        items, total = await list_personal_secrets(
            limit=limit,
            offset=offset,
            include_total=include_total,
            q=q,
            auth_context=auth_context,
        )
    except PersonalSecretCryptoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret query") from exc

    return PersonalSecretListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=PersonalSecretItem, status_code=status.HTTP_201_CREATED)
async def post_personal_secret(
    payload: PersonalSecretCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> PersonalSecretItem:
    try:
        created = await create_personal_secret(payload, auth_context)
    except PersonalSecretCryptoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret entry") from exc

    return PersonalSecretItem.model_validate(created)


@router.get("/{secret_id}", response_model=PersonalSecretItem)
async def get_personal_secret_detail(
    secret_id: Annotated[int, Path(ge=1)],
    auth_context: AuthContext = Depends(require_current_user),
) -> PersonalSecretItem:
    try:
        item = await get_personal_secret(secret_id, auth_context)
    except PersonalSecretCryptoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret detail query") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal secret not found")
    return PersonalSecretItem.model_validate(item)


@router.patch("/{secret_id}", response_model=PersonalSecretItem)
async def patch_personal_secret(
    secret_id: Annotated[int, Path(ge=1)],
    payload: PersonalSecretUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> PersonalSecretItem:
    try:
        item = await update_personal_secret(secret_id, payload, auth_context)
    except PersonalSecretCryptoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret update") from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal secret not found")
    return PersonalSecretItem.model_validate(item)


@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_personal_secret_item(
    secret_id: Annotated[int, Path(ge=1)],
    auth_context: AuthContext = Depends(require_current_user),
) -> None:
    try:
        deleted = await delete_personal_secret(secret_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret delete") from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal secret not found")


@router.post("/{secret_id}/reveal", response_model=PersonalSecretRevealResponse)
async def post_personal_secret_reveal(
    secret_id: Annotated[int, Path(ge=1)],
    payload: PersonalSecretRevealRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> PersonalSecretRevealResponse:
    try:
        value = await reveal_personal_secret(secret_id, payload.field, auth_context)
    except PersonalSecretCryptoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the personal secret reveal") from exc

    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal secret not found")
    if payload.field == "all":
        return PersonalSecretRevealResponse(field=payload.field, values=value)
    return PersonalSecretRevealResponse(field=payload.field, value=value.get(payload.field))
