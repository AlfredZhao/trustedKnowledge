import hashlib
import hmac
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from typing import Any

import oracledb

from app.core.config import settings
from app.db.oracle import acquire_connection
from app.schemas.users import (
    AdminModuleAccessLevel,
    ManagedUserCreate,
    ManagedUserPasswordReset,
    ManagedUserUpdate,
    UserRelationCreate,
    UserRelationUpdate,
)


PBKDF2_ITERATIONS = 120_000
SESSION_DAYS = 14
SUPER_ADMIN_ONLY = "SUPER_ADMIN_ONLY"
ADMIN_ROLE = "ADMIN_ROLE"
ADMIN_MODULES: dict[str, dict[str, str]] = {
    "aiCoding": {
        "label": "AI 编程",
        "description": "控制 AI 编程任务页面是否允许 admin 角色用户访问。",
    },
    "usage": {
        "label": "AI 用量",
        "description": "控制 AI 用量页面是否允许 admin 角色用户访问。",
    },
}

_schema_ready = False
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthContext:
    user_id: int | None
    username: str
    is_admin: bool
    is_admin_role: bool
    visible_user_ids: tuple[int, ...] | None = None


class UserManagementError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class UserConflictError(Exception):
    pass


def admin_auth_context() -> AuthContext:
    return AuthContext(
        user_id=None,
        username=settings.admin_username,
        is_admin=True,
        is_admin_role=False,
        visible_user_ids=None,
    )


def hash_password(password: str, *, salt: str | None = None) -> str:
    salt_value = salt or token_urlsafe(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt_value}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    parts = password_hash.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False

    try:
        iterations = int(parts[1])
    except ValueError:
        return False

    salt = parts[2]
    expected = parts[3]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
    return hmac.compare_digest(digest, expected)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def ensure_user_schema() -> None:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)


async def ensure_user_schema_for_connection(connection: oracledb.AsyncConnection) -> None:
    global _schema_ready
    if _schema_ready:
        return

    cursor = connection.cursor()
    legacy_relations_exists = await _table_exists(cursor, "t_relations")
    await _execute_ddl(
        cursor,
        """
        create table tk_users (
            user_id number generated always as identity primary key,
            username varchar2(100) not null,
            display_name varchar2(100),
            password_hash varchar2(255),
            status varchar2(20) default 'ACTIVE' not null,
            role_code varchar2(30) default 'USER' not null,
            admin_enabled number(1) default 0 not null,
            created_at timestamp default systimestamp not null,
            updated_at timestamp default systimestamp not null,
            last_login_at timestamp,
            constraint tk_users_username_uk unique (username),
            constraint tk_users_status_ck check (status in ('ACTIVE', 'DISABLED')),
            constraint tk_users_role_ck check (role_code in ('USER', 'PARENT')),
            constraint tk_users_admin_enabled_ck check (admin_enabled in (0, 1))
        )
        """,
    )
    await _execute_ddl(
        cursor,
        """
        create table tk_user_sessions (
            session_id number generated always as identity primary key,
            user_id number not null,
            token_hash varchar2(64) not null,
            created_at timestamp default systimestamp not null,
            expires_at timestamp not null,
            revoked_at timestamp,
            constraint tk_user_sessions_token_uk unique (token_hash),
            constraint tk_user_sessions_user_fk foreign key (user_id) references tk_users(user_id)
        )
        """,
    )
    await _execute_ddl(
        cursor,
        """
        create table tk_relations (
            relation_id number generated always as identity primary key,
            parent_user_id number not null,
            child_user_id number not null,
            relation_type varchar2(30) default 'GUARDIAN' not null,
            status varchar2(20) default 'ACTIVE' not null,
            created_at timestamp default systimestamp not null,
            constraint tk_relations_parent_fk foreign key (parent_user_id) references tk_users(user_id),
            constraint tk_relations_child_fk foreign key (child_user_id) references tk_users(user_id),
            constraint tk_relations_pair_uk unique (parent_user_id, child_user_id, relation_type),
            constraint tk_relations_status_ck check (status in ('ACTIVE', 'DISABLED'))
        )
        """,
    )
    await _execute_ddl(cursor, "create index tk_user_sessions_user_idx on tk_user_sessions (user_id, expires_at)")
    await _execute_ddl(cursor, "create index tk_relations_parent_idx on tk_relations (parent_user_id, status)")
    await _execute_ddl(
        cursor,
        """
        create table tk_module_access (
            module_code varchar2(50) primary key,
            access_level varchar2(30) default 'SUPER_ADMIN_ONLY' not null,
            created_at timestamp default systimestamp not null,
            updated_at timestamp default systimestamp not null,
            constraint tk_module_access_level_ck check (access_level in ('SUPER_ADMIN_ONLY', 'ADMIN_ROLE'))
        )
        """,
    )

    await _add_column_if_missing(cursor, "tk_users", "admin_enabled number(1) default 0 not null")
    await _add_column_if_missing(cursor, "t_current", "user_id number")
    await _add_column_if_missing(cursor, "t_history", "user_id number")
    if legacy_relations_exists:
        await _add_column_if_missing(cursor, "t_relations", "student_user_id number")
        await _add_column_if_missing(cursor, "t_relations", "guardian_user_id number")
    await _add_column_if_missing(cursor, "ai_blog_factory", "user_id number")
    await _add_column_if_missing(cursor, "ai_qa_lib", "user_id number")
    await _add_column_if_missing(cursor, "ai_todo_items", "user_id number")
    await _add_column_if_missing(cursor, "t_douyin_details", "user_id number")

    await _migrate_users(cursor, legacy_relations_exists=legacy_relations_exists)
    await _backfill_fact_user_ids(cursor)
    await _backfill_owned_table_user_ids(cursor)
    await _migrate_relations(cursor, legacy_relations_exists=legacy_relations_exists)
    await _migrate_admin_roles(cursor)
    await _ensure_module_access_defaults(cursor)
    await connection.commit()
    _schema_ready = True


async def _execute_ddl(cursor: Any, ddl: str) -> None:
    escaped = ddl.strip().replace("'", "''")
    logger.info("Ensuring Oracle DDL: %s", " ".join(ddl.strip().split())[:160])
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


async def _add_column_if_missing(cursor: Any, table_name: str, column_definition: str) -> None:
    escaped_table = table_name.upper()
    escaped = column_definition.replace("'", "''")
    logger.info("Ensuring Oracle column %s.%s exists", escaped_table, column_definition.split()[0])
    await cursor.execute(
        f"""
        begin
            execute immediate 'alter table {escaped_table} add {escaped}';
        exception
            when others then
                if sqlcode != -1430 then
                    raise;
                end if;
        end;
        """
    )


async def _table_exists(cursor: Any, table_name: str) -> bool:
    await cursor.execute(
        """
        select 1
        from user_tables
        where table_name = :table_name
        """,
        {"table_name": table_name.upper()},
    )
    return await cursor.fetchone() is not None


async def _migrate_users(cursor: Any, *, legacy_relations_exists: bool) -> None:
    username_sources = [
        "select username from t_current where username is not null",
        "select username from t_history where username is not null",
    ]
    if legacy_relations_exists:
        username_sources.extend(
            [
                "select student_user as username from t_relations where student_user is not null",
                "select guardian_user as username from t_relations where guardian_user is not null",
            ]
        )
    await cursor.execute(
        f"""
        select username
        from (
            {" union ".join(username_sources)}
        )
        where username is not null
        """
    )
    usernames = [str(row[0]).strip() for row in await cursor.fetchall() if str(row[0] or "").strip()]
    for username in usernames:
        password_hash = await _legacy_password_hash(cursor, username)
        await cursor.execute(
            """
            merge into tk_users target
            using (select :username as username from dual) source
            on (lower(target.username) = lower(source.username))
            when matched then
                update set
                    target.password_hash = case
                        when target.password_hash is null and :password_hash is not null then :password_hash
                        else target.password_hash
                    end,
                    target.updated_at = systimestamp
            when not matched then
                insert (username, display_name, password_hash, role_code)
                values (:username, :username, :password_hash, 'USER')
            """,
            {"username": username, "password_hash": password_hash},
        )


async def _legacy_password_hash(cursor: Any, username: str) -> str | None:
    await cursor.execute(
        """
        select password
        from t_users
        where lower(username) = lower(:username)
        fetch next 1 rows only
        """,
        {"username": username},
    )
    row = await cursor.fetchone()
    if row is None or row[0] is None:
        return None
    return hash_password(str(row[0]))


async def _backfill_fact_user_ids(cursor: Any) -> None:
    for table_name in ("t_current", "t_history"):
        await cursor.execute(
            f"""
            update {table_name} fact
            set user_id = (
                select user_id
                from tk_users users
                where lower(users.username) = lower(fact.username)
                fetch next 1 rows only
            )
            where user_id is null
              and username is not null
            """
        )


async def _backfill_owned_table_user_ids(cursor: Any) -> None:
    await cursor.execute(
        """
        update ai_blog_factory factory
        set user_id = (
            select knowledge.user_id
            from ai_qa_lib knowledge
            where knowledge.id = factory.knowledge_id
        )
        where user_id is null
          and exists (
              select 1
              from ai_qa_lib knowledge
              where knowledge.id = factory.knowledge_id
                and knowledge.user_id is not null
          )
        """
    )


async def _migrate_relations(cursor: Any, *, legacy_relations_exists: bool) -> None:
    if legacy_relations_exists:
        await cursor.execute(
            """
            update t_relations rel
            set student_user_id = (
                    select user_id
                    from tk_users users
                    where lower(users.username) = lower(rel.student_user)
                    fetch next 1 rows only
                ),
                guardian_user_id = (
                    select user_id
                    from tk_users users
                    where lower(users.username) = lower(rel.guardian_user)
                    fetch next 1 rows only
                )
            where student_user_id is null
               or guardian_user_id is null
            """
        )
        await cursor.execute(
            """
            insert into tk_relations (parent_user_id, child_user_id, relation_type)
            select guardian_user_id, student_user_id, relation_type
            from t_relations rel
            where guardian_user_id is not null
              and student_user_id is not null
              and not exists (
                  select 1
                  from tk_relations tk
                  where tk.parent_user_id = rel.guardian_user_id
                    and tk.child_user_id = rel.student_user_id
                    and tk.relation_type = rel.relation_type
              )
            """
        )
    await cursor.execute(
        """
        update tk_users users
        set role_code = 'PARENT',
            updated_at = systimestamp
        where role_code = 'USER'
          and exists (
              select 1
              from tk_relations rel
              where rel.parent_user_id = users.user_id
                and rel.status = 'ACTIVE'
          )
        """
    )


async def _migrate_admin_roles(cursor: Any) -> None:
    await cursor.execute("update tk_users set admin_enabled = 0 where admin_enabled is null")
    await cursor.execute(
        """
        update tk_users
        set admin_enabled = 1
        where role_code = 'ADMIN'
        """
    )
    await cursor.execute(
        """
        update tk_users users
        set role_code = case
                when exists (
                    select 1
                    from tk_relations rel
                    where rel.parent_user_id = users.user_id
                      and rel.status = 'ACTIVE'
                ) then 'PARENT'
                else 'USER'
            end,
            updated_at = systimestamp
        where role_code = 'ADMIN'
        """
    )


async def _ensure_module_access_defaults(cursor: Any) -> None:
    for module_code in ADMIN_MODULES:
        await cursor.execute(
            """
            merge into tk_module_access target
            using (
                select :module_code as module_code, :access_level as access_level
                from dual
            ) source
            on (target.module_code = source.module_code)
            when matched then update set
                target.updated_at = case
                    when target.access_level is null then systimestamp
                    else target.updated_at
                end,
                target.access_level = coalesce(target.access_level, source.access_level)
            when not matched then insert (
                module_code,
                access_level
            ) values (
                source.module_code,
                source.access_level
            )
            """,
            {"module_code": module_code, "access_level": SUPER_ADMIN_ONLY},
        )


async def authenticate_user(username: str, password: str) -> tuple[str, AuthContext] | None:
    if hmac.compare_digest(username, settings.admin_username) and hmac.compare_digest(password, settings.admin_password):
        return settings.api_key, admin_auth_context()

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            select user_id, username, password_hash, role_code, admin_enabled
            from tk_users
            where lower(username) = lower(:username)
              and status = 'ACTIVE'
            """,
            {"username": username},
        )
        row = await cursor.fetchone()
        if row is None or not row[2] or not verify_password(password, str(row[2])):
            return None

        token = token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(days=SESSION_DAYS)
        await cursor.execute(
            """
            insert into tk_user_sessions (user_id, token_hash, expires_at)
            values (:user_id, :token_hash, :expires_at)
            """,
            {"user_id": row[0], "token_hash": _hash_token(token), "expires_at": expires_at},
        )
        await cursor.execute(
            """
            update tk_users
            set last_login_at = systimestamp,
                updated_at = systimestamp
            where user_id = :user_id
            """,
            {"user_id": row[0]},
        )
        await connection.commit()
        context = await _build_auth_context(
            cursor,
            int(row[0]),
            str(row[1]),
            str(row[3] or "USER"),
            bool(row[4]),
        )
        return token, context


async def authenticate_token(token: str) -> AuthContext | None:
    if token and hmac.compare_digest(token, settings.api_key):
        return admin_auth_context()

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            select users.user_id, users.username, users.role_code, users.admin_enabled
            from tk_user_sessions sessions
            join tk_users users on users.user_id = sessions.user_id
            where sessions.token_hash = :token_hash
              and sessions.revoked_at is null
              and sessions.expires_at > systimestamp
              and users.status = 'ACTIVE'
            """,
            {"token_hash": _hash_token(token)},
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return await _build_auth_context(
            cursor,
            int(row[0]),
            str(row[1]),
            str(row[2] or "USER"),
            bool(row[3]),
        )


async def list_visible_usernames(context: AuthContext) -> list[str]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        if context.is_admin or context.visible_user_ids is None:
            await cursor.execute("select username from tk_users where status = 'ACTIVE' order by username")
            return [str(row[0]) for row in await cursor.fetchall()]

        if not context.visible_user_ids:
            return []

        bind_names = [f"user_id_{index}" for index, _ in enumerate(context.visible_user_ids)]
        params = dict(zip(bind_names, context.visible_user_ids))
        await cursor.execute(
            f"""
            select username
            from tk_users
            where user_id in ({", ".join(f":{name}" for name in bind_names)})
              and status = 'ACTIVE'
            order by username
            """,
            params,
        )
        return [str(row[0]) for row in await cursor.fetchall()]


async def _build_auth_context(
    cursor: Any,
    user_id: int,
    username: str,
    role_code: str,
    admin_enabled: bool,
) -> AuthContext:
    await cursor.execute(
        """
        select child_user_id
        from tk_relations
        where parent_user_id = :user_id
          and status = 'ACTIVE'
        """,
        {"user_id": user_id},
    )
    child_ids = [int(row[0]) for row in await cursor.fetchall()]
    visible_ids = tuple(dict.fromkeys([user_id, *child_ids]))
    return AuthContext(
        user_id=user_id,
        username=username,
        is_admin=False,
        is_admin_role=admin_enabled,
        visible_user_ids=visible_ids,
    )


async def get_or_create_user_id(connection: oracledb.AsyncConnection, username: str) -> int:
    await ensure_user_schema_for_connection(connection)
    cursor = connection.cursor()
    normalized = username.strip()
    await cursor.execute(
        """
        select user_id
        from tk_users
        where lower(username) = lower(:username)
        """,
        {"username": normalized},
    )
    row = await cursor.fetchone()
    if row is not None:
        return int(row[0])

    await cursor.execute(
        """
        insert into tk_users (username, display_name, role_code)
        values (:username, :username, 'USER')
        returning user_id into :new_id
        """,
        {"username": normalized, "new_id": cursor.var(oracledb.NUMBER)},
    )
    await cursor.execute(
        """
        select user_id
        from tk_users
        where lower(username) = lower(:username)
        """,
        {"username": normalized},
    )
    created = await cursor.fetchone()
    if created is None:
        raise RuntimeError("User row was inserted but could not be reloaded")
    return int(created[0])


async def get_user_id_by_username(connection: oracledb.AsyncConnection, username: str) -> int | None:
    await ensure_user_schema_for_connection(connection)
    cursor = connection.cursor()
    await cursor.execute(
        """
        select user_id
        from tk_users
        where lower(username) = lower(:username)
          and status = 'ACTIVE'
        """,
        {"username": username.strip()},
    )
    row = await cursor.fetchone()
    return int(row[0]) if row is not None else None


async def append_requested_username_clause(
    connection: oracledb.AsyncConnection,
    clauses: list[str],
    params: dict[str, Any],
    auth_context: AuthContext,
    username: str | None,
    column: str,
    *,
    param_name: str = "requested_user_id",
) -> None:
    if not username or not username.strip():
        return

    requested_user_id = await get_user_id_by_username(connection, username)
    if requested_user_id is None:
        clauses.append("1 = 0")
        return

    if (
        not auth_context.is_admin
        and auth_context.visible_user_ids is not None
        and requested_user_id not in auth_context.visible_user_ids
    ):
        clauses.append("1 = 0")
        return

    params[param_name] = requested_user_id
    clauses.append(f"{column} = :{param_name}")


def append_user_visibility_clause(
    clauses: list[str],
    params: dict[str, Any],
    auth_context: AuthContext,
    column: str,
) -> None:
    if auth_context.is_admin or auth_context.visible_user_ids is None:
        return
    if not auth_context.visible_user_ids:
        clauses.append("1 = 0")
        return
    bind_names = []
    for index, user_id in enumerate(auth_context.visible_user_ids):
        bind_name = f"visible_user_id_{index}"
        bind_names.append(bind_name)
        params[bind_name] = user_id
    clauses.append(f"{column} in ({', '.join(f':{name}' for name in bind_names)})")


def user_id_for_write(auth_context: AuthContext) -> int | None:
    return None if auth_context.is_admin else auth_context.user_id


def _managed_user_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "user_id": row[0],
        "username": row[1],
        "display_name": row[2],
        "role_code": row[3],
        "is_admin_role": bool(row[4]),
        "status": row[5],
        "has_password": bool(row[6]),
        "parent_count": int(row[7] or 0),
        "child_count": int(row[8] or 0),
        "created_at": row[9],
        "updated_at": row[10],
        "last_login_at": row[11],
    }


def _relation_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "relation_id": row[0],
        "parent_user_id": row[1],
        "parent_username": row[2],
        "child_user_id": row[3],
        "child_username": row[4],
        "relation_type": row[5],
        "status": row[6],
        "created_at": row[7],
    }


async def list_managed_users(*, q: str | None = None) -> tuple[list[dict[str, Any]], int]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        clauses: list[str] = []
        params: dict[str, Any] = {}
        if q:
            clauses.append(
                "(lower(users.username) like '%' || lower(:q) || '%' "
                "or lower(users.display_name) like '%' || lower(:q) || '%')"
            )
            params["q"] = q
        where_sql = " where " + " and ".join(clauses) if clauses else ""
        count_sql = f"select count(*) from tk_users users{where_sql}"
        list_sql = f"""
            select
                users.user_id,
                users.username,
                users.display_name,
                users.role_code,
                users.admin_enabled,
                users.status,
                case when users.password_hash is null then 0 else 1 end as has_password,
                (select count(*) from tk_relations rel where rel.child_user_id = users.user_id and rel.status = 'ACTIVE') as parent_count,
                (select count(*) from tk_relations rel where rel.parent_user_id = users.user_id and rel.status = 'ACTIVE') as child_count,
                users.created_at,
                users.updated_at,
                users.last_login_at
            from tk_users users
            {where_sql}
            order by users.username
        """
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        await cursor.execute(list_sql, params)
        rows = await cursor.fetchall()
    return [_managed_user_row_to_dict(row) for row in rows], int(count_row[0]) if count_row else 0


async def get_managed_user(user_id: int) -> dict[str, Any] | None:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            select
                users.user_id,
                users.username,
                users.display_name,
                users.role_code,
                users.admin_enabled,
                users.status,
                case when users.password_hash is null then 0 else 1 end as has_password,
                (select count(*) from tk_relations rel where rel.child_user_id = users.user_id and rel.status = 'ACTIVE') as parent_count,
                (select count(*) from tk_relations rel where rel.parent_user_id = users.user_id and rel.status = 'ACTIVE') as child_count,
                users.created_at,
                users.updated_at,
                users.last_login_at
            from tk_users users
            where users.user_id = :user_id
            """,
            {"user_id": user_id},
        )
        row = await cursor.fetchone()
    return _managed_user_row_to_dict(row) if row else None


async def create_managed_user(payload: ManagedUserCreate) -> dict[str, Any]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute("select user_id from tk_users where lower(username) = lower(:username)", {"username": payload.username})
        if await cursor.fetchone() is not None:
            raise UserConflictError("Username already exists")

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into tk_users (username, display_name, password_hash, role_code, admin_enabled, status)
            values (:username, :display_name, :password_hash, :role_code, :admin_enabled, 'ACTIVE')
            returning user_id into :new_id
            """,
            {
                "username": payload.username,
                "display_name": payload.display_name or payload.username,
                "password_hash": hash_password(payload.password),
                "role_code": payload.role_code,
                "admin_enabled": 1 if payload.is_admin_role else 0,
                "new_id": new_id,
            },
        )
        await connection.commit()
        user_id = int(new_id.getvalue()[0])

    created = await get_managed_user(user_id)
    if created is None:
        raise RuntimeError("User row was inserted but could not be reloaded")
    return created


async def update_managed_user(user_id: int, payload: ManagedUserUpdate) -> dict[str, Any]:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        existing = await get_managed_user(user_id)
        if existing is None:
            raise UserNotFoundError("User not found")
        return existing

    assignments = []
    params: dict[str, Any] = {"user_id": user_id}
    if "is_admin_role" in values:
        values["admin_enabled"] = 1 if values.pop("is_admin_role") else 0
    for key, value in values.items():
        assignments.append(f"{key} = :{key}")
        params[key] = value
    assignments.append("updated_at = systimestamp")

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            f"""
            update tk_users
            set {", ".join(assignments)}
            where user_id = :user_id
            """,
            params,
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            raise UserNotFoundError("User not found")
        await connection.commit()

    updated = await get_managed_user(user_id)
    if updated is None:
        raise UserNotFoundError("User not found")
    return updated


async def reset_managed_user_password(user_id: int, payload: ManagedUserPasswordReset) -> dict[str, Any]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            update tk_users
            set password_hash = :password_hash,
                updated_at = systimestamp
            where user_id = :user_id
            """,
            {"user_id": user_id, "password_hash": hash_password(payload.password)},
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            raise UserNotFoundError("User not found")
        await cursor.execute(
            """
            update tk_user_sessions
            set revoked_at = systimestamp
            where user_id = :user_id
              and revoked_at is null
            """,
            {"user_id": user_id},
        )
        await connection.commit()

    updated = await get_managed_user(user_id)
    if updated is None:
        raise UserNotFoundError("User not found")
    return updated


async def list_user_relations() -> tuple[list[dict[str, Any]], int]:
    sql = """
        select
            rel.relation_id,
            rel.parent_user_id,
            parent_user.username as parent_username,
            rel.child_user_id,
            child_user.username as child_username,
            rel.relation_type,
            rel.status,
            rel.created_at
        from tk_relations rel
        join tk_users parent_user on parent_user.user_id = rel.parent_user_id
        join tk_users child_user on child_user.user_id = rel.child_user_id
        order by parent_user.username, child_user.username, rel.relation_type
    """
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute("select count(*) from tk_relations")
        count_row = await cursor.fetchone()
        await cursor.execute(sql)
        rows = await cursor.fetchall()
    return [_relation_row_to_dict(row) for row in rows], int(count_row[0]) if count_row else 0


def _build_user_relation_graph(
    users: list[dict[str, Any]],
    relations: list[dict[str, Any]],
) -> dict[str, Any]:
    nodes = []
    edges = []
    active_relation_count = 0

    for relation in relations:
        if relation["status"] == "ACTIVE":
            active_relation_count += 1
        edges.append(
            {
                "relation_id": relation["relation_id"],
                "source_user_id": relation["parent_user_id"],
                "source_username": relation["parent_username"],
                "target_user_id": relation["child_user_id"],
                "target_username": relation["child_username"],
                "relation_type": relation["relation_type"],
                "status": relation["status"],
                "created_at": relation["created_at"],
            }
        )

    for user in users:
        degree = int(user["parent_count"] or 0) + int(user["child_count"] or 0)
        nodes.append(
            {
                "user_id": user["user_id"],
                "username": user["username"],
                "display_name": user["display_name"],
                "role_code": user["role_code"],
                "is_admin_role": bool(user["is_admin_role"]),
                "status": user["status"],
                "parent_count": int(user["parent_count"] or 0),
                "child_count": int(user["child_count"] or 0),
                "degree": degree,
                "is_isolated": degree == 0,
            }
        )

    summary = {
        "total_users": len(users),
        "active_users": sum(1 for user in users if user["status"] == "ACTIVE"),
        "parent_role_users": sum(1 for user in users if user["role_code"] == "PARENT"),
        "admin_role_users": sum(1 for user in users if user["is_admin_role"]),
        "isolated_users": sum(1 for node in nodes if node["is_isolated"]),
        "total_relations": len(relations),
        "active_relations": active_relation_count,
    }

    recommendation = {
        "graph_name": "TK_USER_RELATION_PG",
        "graph_type": "Oracle SQL Property Graph",
        "implementation_status": "Preview on relational data; promote to database metadata graph on Oracle 23ai+",
        "vertex_tables": ["TK_USERS"],
        "edge_tables": ["TK_RELATIONS"],
        "notes": [
            "Keep TK_USERS as the vertex table and map USER/PARENT, admin_enabled, status, and display_name as vertex properties.",
            "Keep TK_RELATIONS as the edge table and map parent_user_id -> child_user_id as directed edges with relation_type, status, and created_at as edge properties.",
            "Use the current API preview to validate graph semantics first, then create a SQL Property Graph metadata layer in Oracle without copying user data.",
        ],
    }

    return {
        "nodes": sorted(nodes, key=lambda item: (item["status"] != "ACTIVE", item["username"].lower())),
        "edges": sorted(edges, key=lambda item: (item["status"] != "ACTIVE", item["source_username"].lower(), item["target_username"].lower())),
        "summary": summary,
        "recommendation": recommendation,
    }


async def get_user_relation(relation_id: int) -> dict[str, Any] | None:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            select
                rel.relation_id,
                rel.parent_user_id,
                parent_user.username as parent_username,
                rel.child_user_id,
                child_user.username as child_username,
                rel.relation_type,
                rel.status,
                rel.created_at
            from tk_relations rel
            join tk_users parent_user on parent_user.user_id = rel.parent_user_id
            join tk_users child_user on child_user.user_id = rel.child_user_id
            where rel.relation_id = :relation_id
            """,
            {"relation_id": relation_id},
        )
        row = await cursor.fetchone()
    return _relation_row_to_dict(row) if row else None


async def get_user_relation_graph() -> dict[str, Any]:
    users, _ = await list_managed_users()
    relations, _ = await list_user_relations()
    return _build_user_relation_graph(users, relations)


async def create_user_relation(payload: UserRelationCreate) -> dict[str, Any]:
    if payload.parent_user_id == payload.child_user_id:
        raise UserManagementError("Parent and child users must be different")

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await _assert_user_exists(cursor, payload.parent_user_id)
        await _assert_user_exists(cursor, payload.child_user_id)
        await cursor.execute(
            """
            select relation_id
            from tk_relations
            where parent_user_id = :parent_user_id
              and child_user_id = :child_user_id
              and relation_type = :relation_type
            """,
            payload.model_dump(),
        )
        if await cursor.fetchone() is not None:
            raise UserConflictError("Relation already exists")

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into tk_relations (parent_user_id, child_user_id, relation_type, status)
            values (:parent_user_id, :child_user_id, :relation_type, 'ACTIVE')
            returning relation_id into :new_id
            """,
            {**payload.model_dump(), "new_id": new_id},
        )
        await cursor.execute(
            """
            update tk_users
            set role_code = 'PARENT',
                updated_at = systimestamp
            where user_id = :parent_user_id
              and role_code = 'USER'
            """,
            {"parent_user_id": payload.parent_user_id},
        )
        await connection.commit()
        relation_id = int(new_id.getvalue()[0])

    relation = await get_user_relation(relation_id)
    if relation is None:
        raise RuntimeError("Relation row was inserted but could not be reloaded")
    return relation


async def update_user_relation(relation_id: int, payload: UserRelationUpdate) -> dict[str, Any]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            update tk_relations
            set status = :status
            where relation_id = :relation_id
            """,
            {"relation_id": relation_id, "status": payload.status},
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            raise UserNotFoundError("Relation not found")
        await connection.commit()

    relation = await get_user_relation(relation_id)
    if relation is None:
        raise UserNotFoundError("Relation not found")
    return relation


async def _assert_user_exists(cursor: Any, user_id: int) -> None:
    await cursor.execute("select user_id from tk_users where user_id = :user_id", {"user_id": user_id})
    if await cursor.fetchone() is None:
        raise UserNotFoundError("User not found")


async def list_admin_module_access() -> list[dict[str, str]]:
    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await _ensure_module_access_defaults(cursor)
        await cursor.execute(
            """
            select module_code, access_level
            from tk_module_access
            where module_code in (:module_code_0, :module_code_1)
            order by module_code
            """,
            {"module_code_0": "aiCoding", "module_code_1": "usage"},
        )
        rows = {str(row[0]): str(row[1]) for row in await cursor.fetchall()}
    return [
        {
            "module_code": module_code,
            "label": meta["label"],
            "description": meta["description"],
            "access_level": rows.get(module_code, SUPER_ADMIN_ONLY),
        }
        for module_code, meta in ADMIN_MODULES.items()
    ]


async def update_admin_module_access(module_code: str, access_level: AdminModuleAccessLevel) -> dict[str, str]:
    if module_code not in ADMIN_MODULES:
        raise UserNotFoundError("Module not found")

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await cursor.execute(
            """
            merge into tk_module_access target
            using (
                select :module_code as module_code, :access_level as access_level
                from dual
            ) source
            on (target.module_code = source.module_code)
            when matched then update set
                target.access_level = source.access_level,
                target.updated_at = systimestamp
            when not matched then insert (
                module_code,
                access_level
            ) values (
                source.module_code,
                source.access_level
            )
            """,
            {"module_code": module_code, "access_level": access_level},
        )
        await connection.commit()

    for item in await list_admin_module_access():
        if item["module_code"] == module_code:
            return item
    raise UserNotFoundError("Module not found")


async def list_visible_admin_modules(context: AuthContext) -> list[str]:
    if context.is_admin:
        return list(ADMIN_MODULES)
    if not context.is_admin_role:
        return []

    async with acquire_connection() as connection:
        await ensure_user_schema_for_connection(connection)
        cursor = connection.cursor()
        await _ensure_module_access_defaults(cursor)
        await cursor.execute(
            """
            select module_code
            from tk_module_access
            where access_level = :access_level
            order by module_code
            """,
            {"access_level": ADMIN_ROLE},
        )
        return [str(row[0]) for row in await cursor.fetchall() if str(row[0]) in ADMIN_MODULES]


async def has_admin_module_access(context: AuthContext, module_code: str) -> bool:
    if module_code not in ADMIN_MODULES:
        return False
    if context.is_admin:
        return True
    if not context.is_admin_role:
        return False
    return module_code in await list_visible_admin_modules(context)
