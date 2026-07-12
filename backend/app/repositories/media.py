from __future__ import annotations

import hashlib
import os
from pathlib import Path
from secrets import token_urlsafe
from typing import Any, BinaryIO

import oracledb

from app.core.config import settings
from app.db.oracle import acquire_connection
from app.repositories.users import AuthContext, append_user_visibility_clause, user_id_for_write


ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

_schema_ready = False


class MediaValidationError(ValueError):
    pass


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "public_id": row[1],
        "url": f"/api/media/{row[1]}/content",
        "markdown": f"![{_markdown_alt(row[4])}](/api/media/{row[1]}/content)",
        "original_filename": row[4],
        "content_type": row[5],
        "size_bytes": int(row[6] or 0),
        "created_at": row[8],
        "object_key": row[3],
    }


async def ensure_media_schema(connection: oracledb.AsyncConnection) -> None:
    global _schema_ready
    if _schema_ready:
        return

    cursor = connection.cursor()
    await _execute_ddl(
        cursor,
        """
        create table tk_media_assets (
            media_id number generated always as identity primary key,
            public_id varchar2(80) not null,
            owner_user_id number,
            storage_type varchar2(20) default 'LOCAL' not null,
            object_key varchar2(1000) not null,
            original_filename varchar2(255),
            content_type varchar2(100) not null,
            size_bytes number not null,
            sha256 varchar2(64) not null,
            created_at timestamp default systimestamp not null,
            deleted_at timestamp,
            constraint tk_media_assets_public_uk unique (public_id),
            constraint tk_media_assets_storage_ck check (storage_type in ('LOCAL'))
        )
        """,
    )
    await _execute_ddl(cursor, "create index tk_media_assets_owner_idx on tk_media_assets (owner_user_id, created_at desc)")
    await _execute_ddl(cursor, "create index tk_media_assets_public_idx on tk_media_assets (public_id, deleted_at)")
    await connection.commit()
    _schema_ready = True


async def _execute_ddl(cursor: Any, ddl: str) -> None:
    escaped = ddl.strip().replace("'", "''")
    await cursor.execute(
        f"""
        begin
            execute immediate '{escaped}';
        exception
            when others then
                if sqlcode not in (-955) then
                    raise;
                end if;
        end;
        """
    )


async def create_media_from_upload(
    *,
    source: BinaryIO,
    original_filename: str | None,
    content_type: str | None,
    auth_context: AuthContext,
) -> dict[str, Any]:
    normalized_type = (content_type or "").split(";")[0].strip().lower()
    extension = ALLOWED_IMAGE_TYPES.get(normalized_type)
    if extension is None:
        raise MediaValidationError("Only PNG, JPEG, WebP, and GIF images are supported")

    public_id = token_urlsafe(24)
    object_key = _build_object_key(public_id, extension)
    target_path = _resolve_storage_path(object_key)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    hasher = hashlib.sha256()
    size = 0
    max_size = settings.media_max_image_size
    try:
        with target_path.open("xb") as output:
            while True:
                chunk = source.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_size:
                    raise MediaValidationError(f"Image exceeds {settings.media_max_image_mb} MB")
                hasher.update(chunk)
                output.write(chunk)
    except Exception:
        target_path.unlink(missing_ok=True)
        raise

    if size <= 0:
        target_path.unlink(missing_ok=True)
        raise MediaValidationError("Uploaded image is empty")

    async with acquire_connection() as connection:
        await ensure_media_schema(connection)
        cursor = connection.cursor()
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into tk_media_assets (
                public_id,
                owner_user_id,
                storage_type,
                object_key,
                original_filename,
                content_type,
                size_bytes,
                sha256
            ) values (
                :public_id,
                :owner_user_id,
                'LOCAL',
                :object_key,
                :original_filename,
                :content_type,
                :size_bytes,
                :sha256
            )
            returning media_id into :new_id
            """,
            {
                "public_id": public_id,
                "owner_user_id": user_id_for_write(auth_context),
                "object_key": object_key,
                "original_filename": _normalize_filename(original_filename),
                "content_type": normalized_type,
                "size_bytes": size,
                "sha256": hasher.hexdigest(),
                "new_id": new_id,
            },
        )
        await connection.commit()
        media_id = int(new_id.getvalue()[0])

    created = await get_media_by_id(media_id, auth_context)
    if created is None:
        raise RuntimeError("Media row was inserted but could not be reloaded")
    return created


async def get_media_by_id(media_id: int, auth_context: AuthContext) -> dict[str, Any] | None:
    clauses = ["media.media_id = :media_id", "media.deleted_at is null"]
    params: dict[str, Any] = {"media_id": media_id}
    append_user_visibility_clause(clauses, params, auth_context, "media.owner_user_id")
    sql = f"""
        select
            media.media_id,
            media.public_id,
            media.storage_type,
            media.object_key,
            media.original_filename,
            media.content_type,
            media.size_bytes,
            media.sha256,
            media.created_at
        from tk_media_assets media
        where {" and ".join(clauses)}
    """
    async with acquire_connection() as connection:
        await ensure_media_schema(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()
    return _row_to_dict(row) if row else None


async def get_media_content(public_id: str) -> tuple[Path, str] | None:
    async with acquire_connection() as connection:
        await ensure_media_schema(connection)
        cursor = connection.cursor()
        return await get_media_content_for_cursor(cursor, public_id)


async def get_media_content_for_cursor(cursor: Any, public_id: str) -> tuple[Path, str] | None:
    await cursor.execute(
        """
        select object_key, content_type
        from tk_media_assets
        where public_id = :public_id
          and deleted_at is null
          and storage_type = 'LOCAL'
        """,
        {"public_id": public_id},
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    path = _resolve_storage_path(str(row[0]))
    if not path.is_file():
        return None
    return path, str(row[1])


async def delete_media(media_id: int, auth_context: AuthContext) -> bool:
    clauses = ["media_id = :media_id", "deleted_at is null"]
    params: dict[str, Any] = {"media_id": media_id}
    append_user_visibility_clause(clauses, params, auth_context, "owner_user_id")
    sql = f"""
        update tk_media_assets
        set deleted_at = systimestamp
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await ensure_media_schema(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return False
        await connection.commit()
    return True


def _build_object_key(public_id: str, extension: str) -> str:
    return f"{public_id[:2]}/{public_id}{extension}"


def _resolve_storage_path(object_key: str) -> Path:
    root = settings.media_storage_path.resolve()
    path = (root / object_key).resolve()
    if os.path.commonpath([root, path]) != str(root):
        raise MediaValidationError("Invalid media storage path")
    return path


def _normalize_filename(value: str | None) -> str | None:
    if value is None:
        return None
    name = Path(value).name.strip().replace("\x00", "")
    if not name:
        return None
    return name[:255]


def _markdown_alt(value: str | None) -> str:
    name = _normalize_filename(value) or "image"
    return name.replace("[", "").replace("]", "").replace("(", "").replace(")", "")
