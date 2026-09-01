from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status

from app.core.security import require_api_key, require_current_user
from app.repositories.skills import (
    SkillNotFoundError,
    SkillPermissionError,
    SkillValidationError,
    create_skill,
    delete_skill,
    get_skill,
    import_skill_zip,
    list_skills,
    read_skill_file,
    update_skill,
    update_skill_file,
)
from app.repositories.skill_generation import generate_skill_draft
from app.repositories.users import AuthContext
from app.schemas.skills import SkillCreate, SkillDetail, SkillDraftGenerationRequest, SkillDraftGenerationResult, SkillFileUpdate, SkillListResponse, SkillUpdate


router = APIRouter(prefix="/skills", tags=["skills"], dependencies=[Depends(require_api_key)])


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc) or "Skill not found")


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _forbidden(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get("", response_model=SkillListResponse)
async def get_skills(
    q: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    enabled: Annotated[bool | None, Query()] = None,
    scope: Annotated[str, Query(pattern="^(owned|callable|shared)$")] = "callable",
    agent_code: Annotated[str | None, Query(max_length=80)] = None,
    auth_context: AuthContext = Depends(require_current_user),
) -> SkillListResponse:
    items, total = list_skills(auth_context, q=q, enabled=enabled, scope=scope, agent_code=agent_code)
    return SkillListResponse(items=items, total=total)


@router.post("", response_model=SkillDetail, status_code=status.HTTP_201_CREATED)
async def post_skill(payload: SkillCreate, auth_context: AuthContext = Depends(require_current_user)) -> SkillDetail:
    try:
        return SkillDetail.model_validate(create_skill(payload, auth_context))
    except SkillValidationError as exc:
        raise _bad_request(exc) from exc


@router.post("/generate-draft", response_model=SkillDraftGenerationResult)
async def post_skill_draft_generation(
    payload: SkillDraftGenerationRequest,
    auth_context: AuthContext = Depends(require_current_user),
) -> SkillDraftGenerationResult:
    try:
        return SkillDraftGenerationResult.model_validate(await generate_skill_draft(payload, auth_context))
    except RuntimeError as exc:
        raise _bad_request(exc) from exc


@router.post("/upload", response_model=SkillDetail, status_code=status.HTTP_201_CREATED)
async def post_skill_upload(
    request: Request,
    filename: Annotated[str, Query(min_length=1, max_length=220)],
    auth_context: AuthContext = Depends(require_current_user),
) -> SkillDetail:
    try:
        return SkillDetail.model_validate(import_skill_zip(filename, await request.body(), auth_context))
    except SkillValidationError as exc:
        raise _bad_request(exc) from exc


@router.get("/{skill_id}", response_model=SkillDetail)
async def get_skill_detail(
    skill_id: Annotated[str, Path(min_length=2, max_length=80)],
    auth_context: AuthContext = Depends(require_current_user),
) -> SkillDetail:
    try:
        return SkillDetail.model_validate(get_skill(skill_id, auth_context))
    except SkillNotFoundError as exc:
        raise _not_found(exc) from exc
    except SkillPermissionError as exc:
        raise _forbidden(exc) from exc


@router.patch("/{skill_id}", response_model=SkillDetail)
async def patch_skill(
    skill_id: Annotated[str, Path(min_length=2, max_length=80)],
    payload: SkillUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> SkillDetail:
    try:
        return SkillDetail.model_validate(update_skill(skill_id, payload, auth_context))
    except SkillNotFoundError as exc:
        raise _not_found(exc) from exc
    except SkillPermissionError as exc:
        raise _forbidden(exc) from exc
    except SkillValidationError as exc:
        raise _bad_request(exc) from exc


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill_item(
    skill_id: Annotated[str, Path(min_length=2, max_length=80)],
    auth_context: AuthContext = Depends(require_current_user),
) -> None:
    try:
        delete_skill(skill_id, auth_context)
    except SkillNotFoundError as exc:
        raise _not_found(exc) from exc
    except SkillPermissionError as exc:
        raise _forbidden(exc) from exc


@router.get("/{skill_id}/files/{file_path:path}")
async def get_skill_file(
    skill_id: Annotated[str, Path(min_length=2, max_length=80)],
    file_path: str,
    auth_context: AuthContext = Depends(require_current_user),
) -> dict[str, str]:
    try:
        return read_skill_file(skill_id, file_path, auth_context)
    except SkillNotFoundError as exc:
        raise _not_found(exc) from exc
    except SkillPermissionError as exc:
        raise _forbidden(exc) from exc
    except SkillValidationError as exc:
        raise _bad_request(exc) from exc


@router.put("/{skill_id}/files/{file_path:path}")
async def put_skill_file(
    skill_id: Annotated[str, Path(min_length=2, max_length=80)],
    file_path: str,
    payload: SkillFileUpdate,
    auth_context: AuthContext = Depends(require_current_user),
) -> dict[str, str]:
    try:
        return update_skill_file(skill_id, file_path, payload.content, auth_context)
    except SkillNotFoundError as exc:
        raise _not_found(exc) from exc
    except SkillPermissionError as exc:
        raise _forbidden(exc) from exc
    except SkillValidationError as exc:
        raise _bad_request(exc) from exc
