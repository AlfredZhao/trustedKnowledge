from datetime import date
from typing import Any

from app.db.oracle import acquire_connection
from app.repositories.users import AuthContext, append_requested_username_clause


LIST_COLUMNS = """
    history_record.id,
    history_record.type,
    history_record.week,
    history_record.day,
    history_record.history_date,
    history_record.content,
    coalesce(record_user.username, history_record.username) as username,
    history_record.v_needs_update,
    history_record.learn_level
"""

SORT_COLUMNS = {
    "history_date": "history_record.history_date",
    "id": "history_record.id",
    "type": "history_record.type",
    "username": "record_user.username",
    "learn_level": "history_record.learn_level",
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
        "similarity": row[9],
    }


def _build_filters(
    q: str | None,
    semantic_query: str | None,
    history_type: str | None,
    week: str | None,
    day: str | None,
    learn_level: int | None,
    v_needs_update: int | None,
    date_from: date | None,
    date_to: date | None,
    auth_context: AuthContext,
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append("lower(history_record.content) like '%' || lower(:q) || '%'")
        params["q"] = q

    if semantic_query:
        # Approximate retrieval must only use vectors built from current content.
        clauses.append("history_record.v is not null")
        clauses.append("nvl(history_record.v_needs_update, 0) = 0")

    if history_type:
        clauses.append("lower(history_record.type) = lower(:history_type)")
        params["history_type"] = history_type

    if week:
        clauses.append("lower(history_record.week) = lower(:week)")
        params["week"] = week

    if day:
        clauses.append("lower(history_record.day) = lower(:day)")
        params["day"] = day

    if learn_level is not None:
        clauses.append("history_record.learn_level = :learn_level")
        params["learn_level"] = learn_level

    if v_needs_update is not None:
        clauses.append("history_record.v_needs_update = :v_needs_update")
        params["v_needs_update"] = v_needs_update

    if date_from is not None:
        clauses.append("history_record.history_date >= :date_from")
        params["date_from"] = date_from

    if date_to is not None:
        clauses.append("history_record.history_date < :date_to + 1")
        params["date_to"] = date_to

    _append_visibility_clause(clauses, params, auth_context)

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_history(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    semantic_query: str | None = None,
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
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int, dict[str, Any]]:
    where_sql, params = _build_filters(
        q,
        semantic_query,
        history_type,
        week,
        day,
        learn_level,
        v_needs_update,
        date_from,
        date_to,
        auth_context,
    )
    sort_column = SORT_COLUMNS.get(sort_by, "history_date")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    async with acquire_connection() as connection:
        clauses = where_sql.removeprefix(" where ").split(" and ") if where_sql else []
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "history_record.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""
        from_sql = """
            from t_history history_record
            left join tk_users record_user on record_user.user_id = history_record.user_id
        """
        count_sql = f"select count(*) {from_sql} {where_sql}"
        summary_sql = f"""
            select
                min(trunc(history_record.history_date)),
                max(trunc(history_record.history_date))
            {from_sql}
            {where_sql}
        """
        similarity_sql = (
            "1 - vector_distance("
            "history_record.v, "
            "vector_embedding(BGE_BASE using :semantic_query as data), "
            "cosine)"
            if semantic_query
            else "cast(null as binary_double)"
        )
        list_order_sql = (
            "similarity desc nulls last, history_record.id desc"
            if semantic_query
            else f"{sort_column} {sort_direction} nulls last, history_record.id desc"
        )
        list_sql = f"""
            select {LIST_COLUMNS},
                   {similarity_sql} as similarity
            {from_sql}
            {where_sql}
            order by {list_order_sql}
            offset :offset rows fetch next :limit rows only
        """
        visibility_clauses: list[str] = []
        visibility_params: dict[str, Any] = {}
        _append_visibility_clause(visibility_clauses, visibility_params, auth_context)
        visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
        type_sql = f"""
            select distinct history_record.type
            {from_sql}
            where history_record.type is not null
            {visibility_sql}
            order by history_record.type
        """
        user_sql = f"""
            select distinct coalesce(record_user.username, history_record.username) as username
            {from_sql}
            where coalesce(record_user.username, history_record.username) is not null
            {visibility_sql}
            order by username
        """
        user_type_sql = f"""
            select coalesce(record_user.username, history_record.username) as username, history_record.type
            {from_sql}
            where coalesce(record_user.username, history_record.username) is not null
              and history_record.type is not null
            {visibility_sql}
            order by username, history_record.type
        """
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        await cursor.execute(summary_sql, params)
        summary_row = await cursor.fetchone()

        await cursor.execute(type_sql, visibility_params)
        type_rows = await cursor.fetchall()

        await cursor.execute(user_sql, visibility_params)
        user_rows = await cursor.fetchall()

        await cursor.execute(user_type_sql, visibility_params)
        user_type_rows = await cursor.fetchall()

        list_params = {**params, "offset": offset, "limit": limit}
        if semantic_query:
            # This bind belongs exclusively to the vector expression in list_sql.
            # count_sql and summary_sql share the filters but do not embed a query.
            list_params["semantic_query"] = semantic_query
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


async def refresh_history_vectors() -> None:
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute("begin pkg_ai_assistant.refresh_history_vectors; end;")
        await connection.commit()


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
    clauses.append(f"history_record.user_id in ({', '.join(f':{name}' for name in bind_names)})")
