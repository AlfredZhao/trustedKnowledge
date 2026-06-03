from datetime import date
from typing import Any

from app.db.oracle import acquire_connection


LIST_COLUMNS = """
    id,
    type,
    week,
    day,
    history_date,
    content,
    username,
    v_needs_update,
    learn_level
"""

SORT_COLUMNS = {
    "history_date": "history_date",
    "id": "id",
    "type": "type",
    "username": "username",
    "learn_level": "learn_level",
}


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "type": row[1],
        "week": row[2],
        "day": row[3],
        "history_date": row[4],
        "content": row[5],
        "username": row[6],
        "v_needs_update": row[7],
        "learn_level": row[8],
    }


def _build_filters(
    q: str | None,
    history_type: str | None,
    username: str | None,
    week: str | None,
    day: str | None,
    learn_level: int | None,
    v_needs_update: int | None,
    date_from: date | None,
    date_to: date | None,
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append("lower(content) like '%' || lower(:q) || '%'")
        params["q"] = q

    if history_type:
        clauses.append("lower(type) = lower(:history_type)")
        params["history_type"] = history_type

    if username:
        clauses.append("lower(username) = lower(:username)")
        params["username"] = username

    if week:
        clauses.append("lower(week) = lower(:week)")
        params["week"] = week

    if day:
        clauses.append("lower(day) = lower(:day)")
        params["day"] = day

    if learn_level is not None:
        clauses.append("learn_level = :learn_level")
        params["learn_level"] = learn_level

    if v_needs_update is not None:
        clauses.append("v_needs_update = :v_needs_update")
        params["v_needs_update"] = v_needs_update

    if date_from is not None:
        clauses.append("history_date >= :date_from")
        params["date_from"] = date_from

    if date_to is not None:
        clauses.append("history_date < :date_to + 1")
        params["date_to"] = date_to

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_history(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    history_type: str | None = None,
    username: str | None = None,
    week: str | None = None,
    day: str | None = None,
    learn_level: int | None = None,
    v_needs_update: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_by: str = "history_date",
    sort_dir: str = "desc",
) -> tuple[list[dict[str, Any]], int, dict[str, Any]]:
    where_sql, params = _build_filters(
        q,
        history_type,
        username,
        week,
        day,
        learn_level,
        v_needs_update,
        date_from,
        date_to,
    )
    sort_column = SORT_COLUMNS.get(sort_by, "history_date")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    count_sql = f"select count(*) from t_history{where_sql}"
    summary_sql = f"""
        select
            min(trunc(history_date)),
            max(trunc(history_date))
        from t_history
        {where_sql}
    """
    list_sql = f"""
        select {LIST_COLUMNS}
        from t_history
        {where_sql}
        order by {sort_column} {sort_direction} nulls last, id desc
        offset :offset rows fetch next :limit rows only
    """
    type_sql = "select distinct type from t_history where type is not null order by type"
    user_sql = "select distinct username from t_history where username is not null order by username"
    user_type_sql = """
        select username, type
        from t_history
        where username is not null
          and type is not null
        order by username, type
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        await cursor.execute(summary_sql, params)
        summary_row = await cursor.fetchone()

        await cursor.execute(type_sql)
        type_rows = await cursor.fetchall()

        await cursor.execute(user_sql)
        user_rows = await cursor.fetchall()

        await cursor.execute(user_type_sql)
        user_type_rows = await cursor.fetchall()

        list_params = {**params, "offset": offset, "limit": limit}
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    user_types: dict[str, list[str]] = {}
    for row in user_type_rows:
        username_value, type_value = row[0], row[1]
        if username_value is None or type_value is None:
            continue
        values = user_types.setdefault(username_value, [])
        if type_value not in values:
            values.append(type_value)

    summary = {
        "total": total,
        "types": [row[0] for row in type_rows if row[0] is not None],
        "users": [row[0] for row in user_rows if row[0] is not None],
        "user_types": user_types,
        "min_date": summary_row[0] if summary_row else None,
        "max_date": summary_row[1] if summary_row else None,
    }
    return [_row_to_dict(row) for row in rows], total, summary
