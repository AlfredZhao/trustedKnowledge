import re
from typing import Any

import oracledb
from fastapi import HTTPException, status

from app.db.oracle import acquire_connection
from app.schemas.current_records import CurrentRecordCreate, CurrentRecordUpdate


WEEKS = [f"W{index}" for index in range(1, 49)]
DAYS = [f"D{index}" for index in range(1, 8)]
LEARN_LEVELS = list(range(1, 11))

LIST_COLUMNS = """
    id,
    type,
    week,
    day,
    content,
    username,
    learn_level
"""

SORT_COLUMNS = {
    "id": "id",
    "type": "type",
    "week": "week",
    "day": "day",
    "username": "username",
    "learn_level": "learn_level",
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
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(type) like '%' || lower(:q) || '%' "
            "or lower(content) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if username:
        clauses.append("lower(username) = lower(:username)")
        params["username"] = username

    if current_type:
        clauses.append("lower(type) = lower(:current_type)")
        params["current_type"] = current_type

    if week:
        clauses.append("week = :week")
        params["week"] = week

    if day:
        clauses.append("day = :day")
        params["day"] = day

    if learn_level is not None:
        clauses.append("learn_level = :learn_level")
        params["learn_level"] = learn_level

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
) -> tuple[list[dict[str, Any]], int]:
    where_sql, params = _build_filters(q, username, current_type, week, day, learn_level)
    sort_column = SORT_COLUMNS.get(sort_by, "id")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    count_sql = f"select count(*) from t_current{where_sql}"
    list_sql = f"""
        select {LIST_COLUMNS}
        from t_current
        {where_sql}
        order by {sort_column} {sort_direction} nulls last, id desc
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


async def get_current_record(record_id: int) -> dict[str, Any] | None:
    sql = f"""
        select {LIST_COLUMNS}
        from t_current
        where id = :record_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, {"record_id": record_id})
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def get_current_record_options() -> dict[str, list[Any]]:
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute("select distinct username from t_current where username is not null order by username")
        user_rows = await cursor.fetchall()

        await cursor.execute("select distinct type from t_current where type is not null order by type")
        type_rows = await cursor.fetchall()

        await cursor.execute(
            """
            select username, type
            from t_current
            where username is not null
              and type is not null
            order by username, type
            """
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


async def create_current_record(payload: CurrentRecordCreate) -> dict[str, Any]:
    duplicate_sql = """
        select id
        from t_current
        where lower(username) = lower(:username)
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
            learn_level
        ) values (
            :current_type,
            'W1',
            'D1',
            :content,
            :username,
            1
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(duplicate_sql, {"username": payload.username, "current_type": payload.type})
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
                "current_type": payload.type,
                "content": payload.content,
                "new_id": new_id,
            },
        )
        await connection.commit()
        record_id = int(new_id.getvalue()[0])

    created = await get_current_record(record_id)
    if created is None:
        raise RuntimeError("Current record was inserted but could not be reloaded")
    return created


async def update_current_record(record_id: int, payload: CurrentRecordUpdate) -> dict[str, Any] | None:
    select_sql = f"""
        select {LIST_COLUMNS}
        from t_current
        where id = :record_id
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
        await cursor.execute(select_sql, {"record_id": record_id})
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

    return await get_current_record(record_id)


async def prepend_todo_to_current_content(
    *,
    username: str,
    current_type: str,
    todo_title: str,
    todo_content: str,
) -> dict[str, Any] | None:
    select_sql = f"""
        select {LIST_COLUMNS}
        from t_current
        where lower(username) = lower(:username)
          and lower(type) = lower(:current_type)
        for update
    """
    update_sql = """
        update t_current
        set content = :content
        where id = :record_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(select_sql, {"username": username, "current_type": current_type})
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

    return await get_current_record(current["id"])


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
