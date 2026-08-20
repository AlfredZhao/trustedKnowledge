from typing import Annotated, Literal

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.errors import oracle_http_exception
from app.core.security import require_admin_user, require_current_user
from app.repositories.english_materials import (
    create_english_material,
    get_english_material,
    list_english_materials,
    refresh_english_vectors,
    update_english_material,
)
from app.repositories.english_generation import complete_english_material, generate_english_material
from app.repositories.users import AuthContext
from app.schemas.english_materials import (
    EnglishMaterialCreate,
    EnglishMaterialCompletionRequest,
    EnglishMaterialCompletionResult,
    EnglishMaterialGenerationRequest,
    EnglishMaterialGenerationResult,
    EnglishMaterialItem,
    EnglishMaterialListResponse,
    EnglishMaterialUpdate,
)


router = APIRouter(prefix="/english-materials", tags=["english-materials"])


@router.get("", response_model=EnglishMaterialListResponse)
async def get_english_materials(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    include_total: bool = True,
    q: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    semantic_query: Annotated[str | None, Query(min_length=1, max_length=400)] = None,
    username: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
    flag: Annotated[int | None, Query(ge=0, le=1)] = None,
    v_needs_update: Annotated[int | None, Query(ge=0, le=1)] = None,
    sort_by: Literal["id", "sequence_no", "category", "base_expression", "title", "flag"] = "id",
    sort_dir: Literal["asc", "desc"] = "desc",
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialListResponse:
    try:
        items, total = await list_english_materials(
            limit=limit,
            offset=offset,
            include_total=include_total,
            q=q,
            semantic_query=semantic_query,
            username=username,
            category=category,
            flag=flag,
            v_needs_update=v_needs_update,
            sort_by=sort_by,
            sort_dir=sort_dir,
            auth_context=auth_context,
        )
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English materials query") from exc

    return EnglishMaterialListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/refresh-vectors", status_code=status.HTTP_204_NO_CONTENT)
async def post_refresh_english_vectors(_: AuthContext = Depends(require_admin_user)) -> None:
    try:
        await refresh_english_vectors()
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English vectors refresh") from exc


@router.post("/generate", response_model=EnglishMaterialGenerationResult)
async def post_generate_english_material(
    payload: EnglishMaterialGenerationRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialGenerationResult:
    try:
        return await generate_english_material(payload, auth_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/complete", response_model=EnglishMaterialCompletionResult)
async def post_complete_english_material(
    payload: EnglishMaterialCompletionRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialCompletionResult:
    try:
        return await complete_english_material(payload, auth_context)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{material_id}", response_model=EnglishMaterialItem)
async def get_english_material_detail(
    material_id: int,
    auth_context: AuthContext = Depends(require_current_user),
) -> EnglishMaterialItem:
    try:
        item = await get_english_material(material_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the English material detail query") from exc

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
        raise oracle_http_exception(exc, "Oracle rejected the English material insert") from exc

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
        raise oracle_http_exception(exc, "Oracle rejected the English material update") from exc

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="English material not found")

    return EnglishMaterialItem.model_validate(updated)
