import re
from typing import Any

import oracledb
from fastapi import HTTPException, status

from app.db.oracle import acquire_connection
from app.repositories.users import AuthContext, get_or_create_user_id, get_user_id_by_username
from app.schemas.current_records import CurrentRecordCreate, CurrentRecordUpdate


WEEKS = [f"W{index}" for index in range(1, 49)]
DAYS = [f"D{index}" for index in range(1, 8)]
LEARN_LEVELS = list(range(1, 11))

LIST_COLUMNS = """
    current_record.id,
    current_record.type,
    current_record.week,
    current_record.day,
    current_record.content,
    coalesce(record_user.username, current_record.username) as username,
    current_record.learn_level
"""

SORT_COLUMNS = {
    "id": "current_record.id",
    "type": "current_record.type",
    "week": "current_record.week",
    "day": "current_record.day",
    "username": "record_user.username",
    "learn_level": "current_record.learn_level",
}


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "type": row[1],
        "week": row[2],
        "day": row[3],
        "content": row[4],
        "username": row[5],
        "learn_level": row[6],
    }


def _build_filters(
    q: str | None,
    username: str | None,
    current_type: str | None,
    week: str | None,
    day: str | None,
    learn_level: int | None,
    auth_context: AuthContext,
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(current_record.type) like '%' || lower(:q) || '%' "
            "or lower(current_record.content) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if username:
        clauses.append("lower(coalesce(record_user.username, current_record.username)) = lower(:username)")
        params["username"] = username

    if current_type:
        clauses.append("lower(current_record.type) = lower(:current_type)")
        params["current_type"] = current_type

    if week:
        clauses.append("current_record.week = :week")
        params["week"] = week

    if day:
        clauses.append("current_record.day = :day")
        params["day"] = day

    if learn_level is not None:
        clauses.append("current_record.learn_level = :learn_level")
        params["learn_level"] = learn_level

    _append_visibility_clause(clauses, params, auth_context)

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_current_records(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    username: str | None = None,
    current_type: str | None = None,
    week: str | None = None,
    day: str | None = None,
    learn_level: int | None = None,
    sort_by: str = "id",
    sort_dir: str = "desc",
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    where_sql, params = _build_filters(q, username, current_type, week, day, learn_level, auth_context)
    sort_column = SORT_COLUMNS.get(sort_by, "id")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    from_sql = """
        from t_current current_record
        left join tk_users record_user on record_user.user_id = current_record.user_id
    """
    count_sql = f"select count(*) {from_sql} {where_sql}"
    list_sql = f"""
        select {LIST_COLUMNS}
        {from_sql}
        {where_sql}
        order by {sort_column} {sort_direction} nulls last, current_record.id desc
        offset :offset rows fetch next :limit rows only
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        await cursor.execute(list_sql, {**params, "offset": offset, "limit": limit})
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows], total


async def get_current_record(record_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    visibility_sql = ""
    params: dict[str, Any] = {"record_id": record_id}
    if auth_context is not None:
        clauses: list[str] = []
        _append_visibility_clause(clauses, params, auth_context)
        visibility_sql = " and " + " and ".join(clauses) if clauses else ""

    sql = f"""
        select {LIST_COLUMNS}
        from t_current current_record
        left join tk_users record_user on record_user.user_id = current_record.user_id
        where current_record.id = :record_id
        {visibility_sql}
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def get_current_record_options(auth_context: AuthContext) -> dict[str, list[Any]]:
    visibility_clauses: list[str] = []
    visibility_params: dict[str, Any] = {}
    _append_visibility_clause(visibility_clauses, visibility_params, auth_context)
    visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(
            f"""
            select distinct coalesce(record_user.username, current_record.username) as username
            from t_current current_record
            left join tk_users record_user on record_user.user_id = current_record.user_id
            where coalesce(record_user.username, current_record.username) is not null
            {visibility_sql}
            order by username
            """,
            visibility_params,
        )
        user_rows = await cursor.fetchall()

        await cursor.execute(
            f"""
            select distinct current_record.type
            from t_current current_record
            left join tk_users record_user on record_user.user_id = current_record.user_id
            where current_record.type is not null
            {visibility_sql}
            order by current_record.type
            """,
            visibility_params,
        )
        type_rows = await cursor.fetchall()

        await cursor.execute(
            f"""
            select coalesce(record_user.username, current_record.username) as username, current_record.type
            from t_current current_record
            left join tk_users record_user on record_user.user_id = current_record.user_id
            where coalesce(record_user.username, current_record.username) is not null
              and current_record.type is not null
            {visibility_sql}
            order by username, current_record.type
            """,
            visibility_params,
        )
        user_type_rows = await cursor.fetchall()

    user_types: dict[str, list[str]] = {}
    for username, current_type in user_type_rows:
        if username is None or current_type is None:
            continue
        values = user_types.setdefault(username, [])
        if current_type not in values:
            values.append(current_type)

    return {
        "users": [row[0] for row in user_rows if row[0] is not None],
        "types": [row[0] for row in type_rows if row[0] is not None],
        "user_types": user_types,
        "weeks": WEEKS,
        "days": DAYS,
        "learn_levels": LEARN_LEVELS,
    }


async def create_current_record(payload: CurrentRecordCreate, auth_context: AuthContext) -> dict[str, Any]:
    duplicate_sql = """
        select id
        from t_current
        where user_id = :user_id
          and lower(type) = lower(:current_type)
        fetch next 1 rows only
    """
    insert_sql = """
        insert into t_current (
            type,
            week,
            day,
            content,
            username,
            user_id,
            learn_level
        ) values (
            :current_type,
            'W1',
            'D1',
            :content,
            :username,
            :user_id,
            1
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        user_id = await _resolve_payload_user_id(connection, payload.username, auth_context)
        await cursor.execute(duplicate_sql, {"user_id": user_id, "current_type": payload.type})
        duplicate = await cursor.fetchone()
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This user already has a current record for this type.",
            )

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            insert_sql,
            {
                "username": payload.username,
                "user_id": user_id,
                "current_type": payload.type,
                "content": payload.content,
                "new_id": new_id,
            },
        )
        await connection.commit()
        record_id = int(new_id.getvalue()[0])

    created = await get_current_record(record_id, auth_context)
    if created is None:
        raise RuntimeError("Current record was inserted but could not be reloaded")
    return created


async def update_current_record(record_id: int, payload: CurrentRecordUpdate, auth_context: AuthContext) -> dict[str, Any] | None:
    params: dict[str, Any] = {"record_id": record_id}
    visibility_clauses: list[str] = []
    _append_visibility_clause(visibility_clauses, params, auth_context)
    visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
    select_sql = f"""
        select {LIST_COLUMNS}
        from t_current current_record
        left join tk_users record_user on record_user.user_id = current_record.user_id
        where current_record.id = :record_id
        {visibility_sql}
        for update
    """
    update_sql = """
        update t_current
        set week = :week,
            day = :day,
            content = :content,
            learn_level = :learn_level
        where id = :record_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(select_sql, params)
        row = await cursor.fetchone()
        if row is None:
            await connection.rollback()
            return None

        current = _row_to_dict(row)
        next_level = _resolve_next_level(current, payload)

        await cursor.execute(
            update_sql,
            {
                "record_id": record_id,
                "week": payload.week,
                "day": payload.day,
                "content": payload.content,
                "learn_level": next_level,
            },
        )
        await connection.commit()

    return await get_current_record(record_id, auth_context)


async def prepend_todo_to_current_content(
    *,
    username: str,
    current_type: str,
    todo_title: str,
    todo_content: str,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {"username": username, "current_type": current_type}
    visibility_clauses: list[str] = []
    _append_visibility_clause(visibility_clauses, params, auth_context)
    visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
    select_sql = f"""
        select {LIST_COLUMNS}
        from t_current current_record
        left join tk_users record_user on record_user.user_id = current_record.user_id
        where lower(coalesce(record_user.username, current_record.username)) = lower(:username)
          and lower(current_record.type) = lower(:current_type)
          {visibility_sql}
        for update
    """
    update_sql = """
        update t_current
        set content = :content
        where id = :record_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(select_sql, params)
        row = await cursor.fetchone()
        if row is None:
            await connection.rollback()
            return None

        current = _row_to_dict(row)
        prepended = _format_todo_current_entry(todo_title, todo_content)
        existing_content = current["content"] or ""
        next_content = prepended if not existing_content.strip() else f"{prepended}\n\n{existing_content}"

        await cursor.execute(update_sql, {"record_id": current["id"], "content": next_content})
        await connection.commit()

    return await get_current_record(current["id"], auth_context)


def _append_visibility_clause(clauses: list[str], params: dict[str, Any], auth_context: AuthContext) -> None:
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
    clauses.append(f"current_record.user_id in ({', '.join(f':{name}' for name in bind_names)})")


async def _resolve_payload_user_id(
    connection: oracledb.AsyncConnection,
    username: str,
    auth_context: AuthContext,
) -> int:
    if auth_context.is_admin:
        return await get_or_create_user_id(connection, username)

    user_id = await get_user_id_by_username(connection, username)
    if user_id is None or user_id not in (auth_context.visible_user_ids or ()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create current records for visible users.",
        )
    return user_id


def _format_todo_current_entry(todo_title: str, todo_content: str) -> str:
    title = todo_title.strip()
    content_lines = [line.strip() for line in todo_content.splitlines() if line.strip()]
    if len(content_lines) == 1:
        content_lines = [item.strip() for item in re.split(r"[，,]", content_lines[0]) if item.strip()]

    bullet_lines = [f"- {line}" for line in content_lines]
    return "\n".join([f"“{title}”", *bullet_lines])


def _resolve_next_level(current: dict[str, Any], payload: CurrentRecordUpdate) -> int:
    current_week = current["week"]
    current_day = current["day"]
    current_level = int(current["learn_level"] or 1)

    if payload.week == current_week:
        return current_level

    expected_week = _next_week(current_week)
    if payload.week != expected_week:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Week can only advance from {current_week} to {expected_week}.",
        )

    if current_week == "W48" and payload.week == "W1":
        return min(current_level + 1, 10)

    if payload.day == current_day:
        return current_level

    return current_level


def _next_week(value: str) -> str:
    if value not in WEEKS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Current week {value} is not a supported week value.",
        )

    index = int(value[1:])
    return "W1" if index >= 48 else f"W{index + 1}"
