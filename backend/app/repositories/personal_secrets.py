from typing import Any

import logging
import oracledb

from app.db.oracle import acquire_connection
from app.repositories.users import AuthContext, user_id_for_write
from app.schemas.personal_secrets import PersonalSecretCreate, PersonalSecretUpdate
from app.services.personal_secret_crypto import decrypt_personal_secret, encrypt_personal_secret


LIST_COLUMNS = """
    secret.secret_id,
    secret.system_name,
    secret.login_url,
    secret.username_cipher,
    secret.username_nonce,
    secret.password_cipher,
    secret.password_nonce,
    secret.notes_cipher,
    secret.notes_nonce,
    secret.tags,
    secret.created_at,
    secret.updated_at
"""

_table_ready = False
logger = logging.getLogger(__name__)


def _owner_username(auth_context: AuthContext) -> str:
    return auth_context.username


def _aad(secret_id: int, owner_username: str, field_name: str) -> str:
    return f"personal-secret:{owner_username}:{secret_id}:{field_name}"


def _preview(value: str | None) -> str | None:
    if not value:
        return None
    chars = list(value)
    if len(chars) <= 2:
        return "*" * len(chars)
    if len(chars) <= 6:
        return f"{chars[0]}***{chars[-1]}"
    return f"{''.join(chars[:2])}***{''.join(chars[-2:])}"


def _row_to_item(row: Any, owner_username: str) -> dict[str, Any]:
    secret_id = int(row[0])
    username = decrypt_personal_secret(row[3], row[4], aad=_aad(secret_id, owner_username, "username")) if row[3] and row[4] else None
    notes = decrypt_personal_secret(row[7], row[8], aad=_aad(secret_id, owner_username, "notes")) if row[7] and row[8] else None
    return {
        "id": secret_id,
        "system_name": row[1],
        "login_url": row[2],
        "username_preview": _preview(username),
        "notes_preview": _preview(notes),
        "tags": row[9],
        "has_username": bool(row[3] and row[4]),
        "has_password": bool(row[5] and row[6]),
        "has_notes": bool(row[7] and row[8]),
        "created_at": row[10],
        "updated_at": row[11],
    }


async def _ensure_personal_secrets_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    logger.info("Ensuring Oracle table tk_personal_secrets exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create table tk_personal_secrets (
                    secret_id number generated always as identity primary key,
                    user_id number,
                    owner_username varchar2(100) not null,
                    system_name varchar2(200) not null,
                    login_url varchar2(1000),
                    username_cipher clob,
                    username_nonce varchar2(64),
                    password_cipher clob not null,
                    password_nonce varchar2(64) not null,
                    notes_cipher clob,
                    notes_nonce varchar2(64),
                    tags varchar2(500),
                    key_version number default 1 not null,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp,
                    constraint tk_personal_secret_user_fk foreign key (user_id) references tk_users(user_id)
                )
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    logger.info("Ensuring Oracle index tk_personal_secret_owner_name_idx exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create index tk_personal_secret_owner_name_idx
                on tk_personal_secrets (owner_username, system_name)
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    logger.info("Ensuring Oracle index tk_personal_secret_owner_updated_idx exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create index tk_personal_secret_owner_updated_idx
                on tk_personal_secrets (owner_username, updated_at desc)
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    _table_ready = True


def _build_filters(q: str | None, auth_context: AuthContext) -> tuple[list[str], dict[str, Any]]:
    params: dict[str, Any] = {"owner_username": _owner_username(auth_context)}
    clauses = ["secret.owner_username = :owner_username"]

    if q:
        clauses.append(
            "(lower(secret.system_name) like '%' || lower(:q) || '%' "
            "or lower(secret.login_url) like '%' || lower(:q) || '%' "
            "or lower(secret.tags) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    return clauses, params


async def list_personal_secrets(
    *,
    limit: int,
    offset: int,
    include_total: bool,
    q: str | None,
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        clauses, params = _build_filters(q, auth_context)
        where_sql = f" where {' and '.join(clauses)}"
        cursor = connection.cursor()

        total = 0
        if include_total:
            await cursor.execute(f"select count(*) from tk_personal_secrets secret{where_sql}", params)
            row = await cursor.fetchone()
            total = int(row[0]) if row else 0

        await cursor.execute(
            f"""
            select {LIST_COLUMNS}
            from tk_personal_secrets secret
            {where_sql}
            order by secret.updated_at desc nulls last, secret.created_at desc, secret.secret_id desc
            offset :offset rows fetch next :limit rows only
            """,
            {**params, "offset": offset, "limit": limit},
        )
        rows = await cursor.fetchall()

    items = [_row_to_item(row, _owner_username(auth_context)) for row in rows]
    return items, total if include_total else len(items)


async def get_personal_secret(secret_id: int, auth_context: AuthContext) -> dict[str, Any] | None:
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        cursor = connection.cursor()
        await cursor.execute(
            f"""
            select {LIST_COLUMNS}
            from tk_personal_secrets secret
            where secret.secret_id = :secret_id and secret.owner_username = :owner_username
            """,
            {"secret_id": secret_id, "owner_username": _owner_username(auth_context)},
        )
        row = await cursor.fetchone()

    return _row_to_item(row, _owner_username(auth_context)) if row else None


async def create_personal_secret(payload: PersonalSecretCreate, auth_context: AuthContext) -> dict[str, Any]:
    owner_username = _owner_username(auth_context)
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        cursor = connection.cursor()
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into tk_personal_secrets (
                user_id, owner_username, system_name, login_url, password_cipher, password_nonce, tags
            ) values (
                :user_id, :owner_username, :system_name, :login_url, :password_cipher, :password_nonce, :tags
            )
            returning secret_id into :new_id
            """,
            {
                "user_id": user_id_for_write(auth_context),
                "owner_username": owner_username,
                "system_name": payload.system_name,
                "login_url": payload.login_url,
                "password_cipher": "pending",
                "password_nonce": "pending",
                "tags": payload.tags,
                "new_id": new_id,
            },
        )
        secret_id = int(new_id.getvalue()[0])
        encrypted = _encrypt_payload_fields(secret_id, owner_username, payload)
        _set_lob_input_sizes(cursor, ["username_cipher", "password_cipher", "notes_cipher"])
        await cursor.execute(
            """
            update tk_personal_secrets
            set username_cipher = :username_cipher,
                username_nonce = :username_nonce,
                password_cipher = :password_cipher,
                password_nonce = :password_nonce,
                notes_cipher = :notes_cipher,
                notes_nonce = :notes_nonce,
                updated_at = systimestamp
            where secret_id = :secret_id and owner_username = :owner_username
            """,
            {
                **encrypted,
                "secret_id": secret_id,
                "owner_username": owner_username,
            },
        )
        await connection.commit()

    created = await get_personal_secret(secret_id, auth_context)
    if created is None:
        raise RuntimeError("Personal secret row was inserted but could not be reloaded")
    return created


async def update_personal_secret(secret_id: int, payload: PersonalSecretUpdate, auth_context: AuthContext) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_personal_secret(secret_id, auth_context)

    owner_username = _owner_username(auth_context)
    assignments: list[str] = []
    params: dict[str, Any] = {"secret_id": secret_id, "owner_username": owner_username}

    for plain_field in ("system_name", "login_url", "tags"):
        if plain_field in values:
            assignments.append(f"{plain_field} = :{plain_field}")
            params[plain_field] = values[plain_field]

    for field_name in ("username", "password", "notes"):
        if field_name in values:
            if field_name == "password" and values[field_name] is None:
                continue
            encrypted = encrypt_personal_secret(values[field_name], aad=_aad(secret_id, owner_username, field_name))
            assignments.append(f"{field_name}_cipher = :{field_name}_cipher")
            assignments.append(f"{field_name}_nonce = :{field_name}_nonce")
            params[f"{field_name}_cipher"] = encrypted.cipher if encrypted else None
            params[f"{field_name}_nonce"] = encrypted.nonce if encrypted else None

    if not assignments:
        return await get_personal_secret(secret_id, auth_context)

    assignments.append("updated_at = systimestamp")
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        cursor = connection.cursor()
        if any(key.endswith("_cipher") for key in params):
            _set_lob_input_sizes(cursor, [key for key in params if key.endswith("_cipher")])
        await cursor.execute(
            f"""
            update tk_personal_secrets
            set {', '.join(assignments)}
            where secret_id = :secret_id and owner_username = :owner_username
            """,
            params,
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_personal_secret(secret_id, auth_context)


async def delete_personal_secret(secret_id: int, auth_context: AuthContext) -> bool:
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        cursor = connection.cursor()
        await cursor.execute(
            "delete from tk_personal_secrets where secret_id = :secret_id and owner_username = :owner_username",
            {"secret_id": secret_id, "owner_username": _owner_username(auth_context)},
        )
        deleted = cursor.rowcount > 0
        await connection.commit()
    return deleted


async def reveal_personal_secret(secret_id: int, field: str, auth_context: AuthContext) -> dict[str, str | None] | None:
    owner_username = _owner_username(auth_context)
    async with acquire_connection() as connection:
        await _ensure_personal_secrets_table(connection)
        cursor = connection.cursor()
        await cursor.execute(
            f"""
            select {LIST_COLUMNS}
            from tk_personal_secrets secret
            where secret.secret_id = :secret_id and secret.owner_username = :owner_username
            """,
            {"secret_id": secret_id, "owner_username": owner_username},
        )
        row = await cursor.fetchone()

    if not row:
        return None

    values = {
        "system_name": row[1],
        "login_url": row[2],
        "username": decrypt_personal_secret(row[3], row[4], aad=_aad(secret_id, owner_username, "username")),
        "password": decrypt_personal_secret(row[5], row[6], aad=_aad(secret_id, owner_username, "password")),
        "notes": decrypt_personal_secret(row[7], row[8], aad=_aad(secret_id, owner_username, "notes")),
        "tags": row[9],
    }
    if field == "all":
        return values
    return {field: values.get(field)}


def _encrypt_payload_fields(secret_id: int, owner_username: str, payload: PersonalSecretCreate) -> dict[str, str | None]:
    encrypted_username = encrypt_personal_secret(payload.username, aad=_aad(secret_id, owner_username, "username"))
    encrypted_password = encrypt_personal_secret(payload.password, aad=_aad(secret_id, owner_username, "password"))
    encrypted_notes = encrypt_personal_secret(payload.notes, aad=_aad(secret_id, owner_username, "notes"))
    if encrypted_password is None:
        raise RuntimeError("Password encryption returned no value")
    return {
        "username_cipher": encrypted_username.cipher if encrypted_username else None,
        "username_nonce": encrypted_username.nonce if encrypted_username else None,
        "password_cipher": encrypted_password.cipher,
        "password_nonce": encrypted_password.nonce,
        "notes_cipher": encrypted_notes.cipher if encrypted_notes else None,
        "notes_nonce": encrypted_notes.nonce if encrypted_notes else None,
    }


def _set_lob_input_sizes(cursor: Any, field_names: list[str]) -> None:
    cursor.setinputsizes(**{field_name: oracledb.DB_TYPE_CLOB for field_name in field_names})
