from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_current_user
from app.repositories.english_materials import (
    create_english_material,
    get_english_material,
    list_english_materials,
    update_english_material,
)
from app.repositories.users import AuthContext
from app.schemas.english_materials import (
    EnglishMaterialCreate,
    EnglishMaterialItem,
    EnglishMaterialListResponse,
    EnglishMaterialUpdate,
)


router = APIRouter(prefix="/english-materials", tags=["english-materials"])


@router.get("", response_model=EnglishMaterialListResponse)
async def get_english_materials(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    flag: Annotated[int | None, Query(ge=0, le=1)] = None,
    sort_by: Literal["id", "sequence_no", "category", "base_expression", "title", "flag"] = "id",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialListResponse:
    try:
        items, total = await list_english_materials(
            limit=limit,
            offset=offset,
            q=q,
            category=category,
            flag=flag,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the English materials query: {message}",
        ) from exc

    return EnglishMaterialListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{material_id}", response_model=EnglishMaterialItem)
async def get_english_material_detail(
    material_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        item = await get_english_material(material_id, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the English material detail query: {message}",
        ) from exc

    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="English material not found")

    return EnglishMaterialItem.model_validate(item)


@router.post("", response_model=EnglishMaterialItem, status_code=status.HTTP_201_CREATED)
async def post_english_material(
    payload: EnglishMaterialCreate,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        created = await create_english_material(payload, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the English material insert: {message}",
        ) from exc

    return EnglishMaterialItem.model_validate(created)


@router.patch("/{material_id}", response_model=EnglishMaterialItem)
async def patch_english_material(
    material_id: int,
    payload: EnglishMaterialUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        updated = await update_english_material(material_id, payload, auth_context)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the English material update: {message}",
        ) from exc

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="English material not found")

    return EnglishMaterialItem.model_validate(updated)
