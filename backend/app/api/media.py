from typing import Annotated

import oracledb
from fastapi import APIRouter, Depends, File, HTTPException, Path, UploadFile, status
from fastapi.responses import FileResponse

from app.api.errors import oracle_http_exception
from app.core.security import require_current_user
from app.repositories.media import (
    MediaValidationError,
    create_media_from_upload,
    delete_media,
    get_media_content,
)
from app.repositories.users import AuthContext
from app.schemas.media import MediaUploadResponse


router = APIRouter(prefix="/media", tags=["media"])


@router.post("", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: Annotated[UploadFile, File(...)],
    auth_context: AuthContext = Depends(require_current_user),
) -> MediaUploadResponse:
    try:
        created = await create_media_from_upload(
            source=file.file,
            original_filename=file.filename,
            content_type=file.content_type,
            auth_context=auth_context,
        )
    except MediaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the media upload") from exc
    finally:
        await file.close()

    return MediaUploadResponse.model_validate(created)


@router.get("/{public_id}/content")
async def get_media_file(public_id: Annotated[str, Path(min_length=20, max_length=80)]) -> FileResponse:
    media = await get_media_content(public_id)
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    path, content_type = media
    return FileResponse(path, media_type=content_type)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media_item(
    media_id: Annotated[int, Path(ge=1)],
    auth_context: AuthContext = Depends(require_current_user),
) -> None:
    try:
        deleted = await delete_media(media_id, auth_context)
    except oracledb.Error as exc:
        raise oracle_http_exception(exc, "Oracle rejected the media deletion") from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
