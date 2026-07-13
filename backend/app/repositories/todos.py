from typing import Any

import logging
import oracledb

from app.db.oracle import acquire_connection
from app.repositories.users import (
    AuthContext,
    append_requested_username_clause,
    append_user_visibility_clause,
    user_id_for_write,
)
from app.schemas.todos import TodoCreate, TodoUpdate


LIST_COLUMNS = """
    todo_item.id,
    todo_item.title,
    todo_item.content,
    todo_item.source,
    todo_item.topic_tag,
    todo_item.created_at,
    todo_item.updated_at,
    todo_item.todo_status
"""

_table_ready = False
logger = logging.getLogger(__name__)


class TodoUpdateLocked(RuntimeError):
    pass


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "title": row[1],
        "content": row[2],
        "source": row[3],
        "topic_tag": row[4],
        "created_at": row[5],
        "updated_at": row[6],
        "todo_status": row[7],
    }


async def _ensure_todo_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    logger.info("Ensuring Oracle table ai_todo_items exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_todo_items (
                    id number generated always as identity primary key,
                    title clob not null,
                    content clob not null,
                    source varchar2(200),
                    topic_tag varchar2(100),
                    user_id number,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp,
                    todo_status varchar2(20) default ''待处理'' not null,
                    constraint ai_todo_items_status_ck
                        check (todo_status in (''待处理'', ''处理中'', ''已完成''))
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
    logger.info("Ensuring Oracle column ai_todo_items.user_id exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                alter table ai_todo_items
                add user_id number
            ';
        exception
            when others then
                if sqlcode != -1430 then
                    raise;
                end if;
        end;
        """
    )
    logger.info("Ensuring Oracle index ai_todo_items_status_idx exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create index ai_todo_items_status_idx
                on ai_todo_items (todo_status, created_at)
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    logger.info("Ensuring Oracle index ai_todo_items_user_status_created_idx exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create index ai_todo_items_user_status_created_idx
                on ai_todo_items (user_id, todo_status, created_at desc)
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


def _build_filters(q: str | None, todo_status: str | None, auth_context: AuthContext) -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(dbms_lob.substr(todo_item.title, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(todo_item.content, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(todo_item.source) like '%' || lower(:q) || '%' "
            "or lower(todo_item.topic_tag) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if todo_status:
        clauses.append("todo_item.todo_status = :todo_status")
        params["todo_status"] = todo_status

    append_user_visibility_clause(clauses, params, auth_context, "todo_item.user_id")
    return clauses, params


async def list_todos(
    *,
    limit: int,
    offset: int,
    include_total: bool = True,
    q: str | None = None,
    username: str | None = None,
    todo_status: str | None = None,
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        clauses, params = _build_filters(q, todo_status, auth_context)
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "todo_item.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""

        count_sql = f"select count(*) from ai_todo_items todo_item{where_sql}"
        list_sql = f"""
            select {LIST_COLUMNS}
            from ai_todo_items todo_item
            {where_sql}
            order by todo_item.created_at desc nulls last, todo_item.id desc
            offset :offset rows fetch next :limit rows only
        """
        cursor = connection.cursor()
        total = 0
        if include_total:
            await cursor.execute(count_sql, params)
            count_row = await cursor.fetchone()
            total = int(count_row[0]) if count_row else 0

        list_params = {**params, "offset": offset, "limit": limit}
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    items = [_row_to_dict(row) for row in rows]
    return items, total if include_total else len(items)


async def get_todo_by_id(todo_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    params: dict[str, Any] = {"todo_id": todo_id}
    clauses = ["todo_item.id = :todo_id"]
    if auth_context is not None:
        append_user_visibility_clause(clauses, params, auth_context, "todo_item.user_id")
    sql = f"""
        select {LIST_COLUMNS}
        from ai_todo_items todo_item
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_todo(payload: TodoCreate, auth_context: AuthContext) -> dict[str, Any]:
    sql = """
        insert into ai_todo_items (
            title,
            content,
            source,
            topic_tag,
            user_id,
            todo_status
        ) values (
            :title,
            :content,
            :source,
            :topic_tag,
            :user_id,
            :todo_status
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        _set_todo_lob_input_sizes(cursor)
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            sql,
            {
                "title": payload.title,
                "content": payload.content,
                "source": payload.source,
                "topic_tag": payload.topic_tag,
                "user_id": user_id_for_write(auth_context),
                "todo_status": payload.todo_status,
                "new_id": new_id,
            },
        )
        await connection.commit()
        todo_id = int(new_id.getvalue()[0])

    created = await get_todo_by_id(todo_id, auth_context)
    if created is None:
        raise RuntimeError("Todo row was inserted but could not be reloaded")
    return created


async def update_todo(todo_id: int, payload: TodoUpdate, auth_context: AuthContext) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_todo_by_id(todo_id, auth_context)

    assignments = [f"{column} = :{column}" for column in values]
    assignments.append("updated_at = systimestamp")
    params = {**values, "todo_id": todo_id}
    lock_params: dict[str, Any] = {"todo_id": todo_id}
    lock_clauses = ["id = :todo_id"]
    append_user_visibility_clause(lock_clauses, lock_params, auth_context, "user_id")
    update_clauses = ["id = :todo_id"]
    append_user_visibility_clause(update_clauses, params, auth_context, "user_id")
    lock_sql = f"""
        select id
        from ai_todo_items
        where {" and ".join(lock_clauses)}
        for update wait 5
    """
    sql = f"""
        update ai_todo_items
        set {", ".join(assignments)}
        where {" and ".join(update_clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        _set_todo_lob_input_sizes(cursor)
        try:
            await cursor.execute(lock_sql, lock_params)
        except oracledb.Error as exc:
            if _is_lock_timeout_error(exc):
                await connection.rollback()
                raise TodoUpdateLocked("待办事项正在被另一个保存请求占用，请稍后重试。") from exc
            raise
        locked_row = await cursor.fetchone()
        if locked_row is None:
            await connection.rollback()
            return None
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_todo_by_id(todo_id, auth_context)


def _is_lock_timeout_error(exc: oracledb.Error) -> bool:
    error = exc.args[0] if exc.args else exc
    code = getattr(error, "code", None)
    message = getattr(error, "message", str(exc))
    return code == 30006 or "ORA-30006" in message


def _set_todo_lob_input_sizes(cursor: Any) -> None:
    cursor.setinputsizes(title=oracledb.DB_TYPE_CLOB, content=oracledb.DB_TYPE_CLOB)
