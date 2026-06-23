from typing import Annotated

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.security import require_admin_user
from app.repositories.users import (
    AuthContext,
    UserConflictError,
    UserManagementError,
    UserNotFoundError,
    create_managed_user,
    create_user_relation,
    list_admin_module_access,
    list_managed_users,
    list_user_relations,
    reset_managed_user_password,
    update_admin_module_access,
    update_managed_user,
    update_user_relation,
)
from app.schemas.users import (
    AdminModuleAccessItem,
    AdminModuleAccessListResponse,
    AdminModuleAccessUpdate,
    ManagedUserCreate,
    ManagedUserItem,
    ManagedUserListResponse,
    ManagedUserPasswordReset,
    ManagedUserUpdate,
    UserRelationCreate,
    UserRelationItem,
    UserRelationListResponse,
    UserRelationUpdate,
)


router = APIRouter(prefix="/users", tags=["users"])


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc) or "Item not found")


def _conflict(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("", response_model=ManagedUserListResponse)
async def get_users(
    q: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    _: AuthContext = Depends(require_admin_user),
) -> ManagedUserListResponse:
    try:
        items, total = await list_managed_users(q=q)
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the user list query") from exc
    return ManagedUserListResponse(items=items, total=total)


@router.post("", response_model=ManagedUserItem, status_code=status.HTTP_201_CREATED)
async def post_user(
    payload: ManagedUserCreate,
    _: AuthContext = Depends(require_admin_user),
) -> ManagedUserItem:
    try:
        return ManagedUserItem.model_validate(await create_managed_user(payload))
    except UserConflictError as exc:
        raise _conflict(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the user insert") from exc


@router.patch("/{user_id}", response_model=ManagedUserItem)
async def patch_user(
    user_id: Annotated[int, Path(ge=1)],
    payload: ManagedUserUpdate,
    _: AuthContext = Depends(require_admin_user),
) -> ManagedUserItem:
    try:
        return ManagedUserItem.model_validate(await update_managed_user(user_id, payload))
    except UserNotFoundError as exc:
        raise _not_found(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the user update") from exc


@router.post("/{user_id}/reset-password", response_model=ManagedUserItem)
async def post_user_password_reset(
    user_id: Annotated[int, Path(ge=1)],
    payload: ManagedUserPasswordReset,
    _: AuthContext = Depends(require_admin_user),
) -> ManagedUserItem:
    try:
        return ManagedUserItem.model_validate(await reset_managed_user_password(user_id, payload))
    except UserNotFoundError as exc:
        raise _not_found(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the password reset") from exc


@router.get("/relations", response_model=UserRelationListResponse)
async def get_relations(_: AuthContext = Depends(require_admin_user)) -> UserRelationListResponse:
    try:
        items, total = await list_user_relations()
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the relation list query") from exc
    return UserRelationListResponse(items=items, total=total)


@router.post("/relations", response_model=UserRelationItem, status_code=status.HTTP_201_CREATED)
async def post_relation(
    payload: UserRelationCreate,
    _: AuthContext = Depends(require_admin_user),
) -> UserRelationItem:
    try:
        return UserRelationItem.model_validate(await create_user_relation(payload))
    except UserConflictError as exc:
        raise _conflict(exc) from exc
    except UserNotFoundError as exc:
        raise _not_found(exc) from exc
    except UserManagementError as exc:
        raise _bad_request(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the relation insert") from exc


@router.patch("/relations/{relation_id}", response_model=UserRelationItem)
async def patch_relation(
    relation_id: Annotated[int, Path(ge=1)],
    payload: UserRelationUpdate,
    _: AuthContext = Depends(require_admin_user),
) -> UserRelationItem:
    try:
        return UserRelationItem.model_validate(await update_user_relation(relation_id, payload))
    except UserNotFoundError as exc:
        raise _not_found(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the relation update") from exc


@router.get("/admin-modules", response_model=AdminModuleAccessListResponse)
async def get_admin_modules(_: AuthContext = Depends(require_admin_user)) -> AdminModuleAccessListResponse:
    try:
        items = await list_admin_module_access()
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the admin module settings query") from exc
    return AdminModuleAccessListResponse(items=[AdminModuleAccessItem.model_validate(item) for item in items])


@router.patch("/admin-modules/{module_code}", response_model=AdminModuleAccessItem)
async def patch_admin_module(
    module_code: str,
    payload: AdminModuleAccessUpdate,
    _: AuthContext = Depends(require_admin_user),
) -> AdminModuleAccessItem:
    try:
        item = await update_admin_module_access(module_code, payload.access_level)
    except UserNotFoundError as exc:
        raise _not_found(exc) from exc
    except oracledb.Error as exc:
        raise _oracle_error(exc, "Oracle rejected the admin module settings update") from exc
    return AdminModuleAccessItem.model_validate(item)


def _oracle_error(exc: oracledb.Error, prefix: str) -> HTTPException:
    error = exc.args[0] if exc.args else exc
    message = getattr(error, "message", str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{prefix}: {message}")
