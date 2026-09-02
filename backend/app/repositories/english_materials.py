import json
from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.repositories.users import (
    AuthContext,
    append_requested_username_clause,
    append_user_visibility_clause,
    user_id_for_write,
)
from app.schemas.english_materials import EnglishMaterialCreate, EnglishMaterialUpdate


LIST_COLUMNS = """
    material.english_id,
    material.sequence_no,
    material.category,
    material.base_expression,
    material.professional_sentence,
    material.chinese_translation,
    material.full_script,
    material.is_flagged,
    material.title,
    material.v_needs_update,
    cast(null as binary_double) as similarity,
    material.card_sections
"""

SORT_COLUMNS = {
    "id": "material.english_id",
    "sequence_no": "material.sequence_no",
    "category": "material.category",
    "base_expression": "material.base_expression",
    "title": "material.title",
    "flag": "material.is_flagged",
}

UPDATE_COLUMNS = {
    "sequence_no": "sequence_no",
    "category": "category",
    "base_expression": "base_expression",
    "professional_sentence": "professional_sentence",
    "chinese_translation": "chinese_translation",
    "full_script": "full_script",
    "flag": "is_flagged",
    "title": "title",
    "card_sections": "card_sections",
}


def _row_to_dict(row: Any) -> dict[str, Any]:
    card_sections = row[11]
    if hasattr(card_sections, "read"):
        card_sections = card_sections.read()
    if isinstance(card_sections, str):
        card_sections = json.loads(card_sections)
    return {
        "id": row[0],
        "sequence_no": row[1],
        "category": row[2],
        "base_expression": row[3],
        "professional_sentence": row[4],
        "chinese_translation": row[5],
        "full_script": row[6],
        "flag": row[7],
        "title": row[8],
        "v_needs_update": row[9],
        "similarity": row[10],
        "card_sections": card_sections,
    }


def _build_filters(
    q: str | None,
    semantic_query: str | None,
    category: str | None,
    flag: int | None,
    v_needs_update: int | None,
    auth_context: AuthContext,
) -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(material.title) like '%' || lower(:q) || '%' "
            "or lower(material.category) like '%' || lower(:q) || '%' "
            "or lower(material.base_expression) like '%' || lower(:q) || '%' "
            "or lower(material.professional_sentence) like '%' || lower(:q) || '%' "
            "or lower(material.chinese_translation) like '%' || lower(:q) || '%' "
            "or lower(material.full_script) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if semantic_query:
        clauses.append("material.v is not null")
        clauses.append("nvl(material.v_needs_update, 0) = 0")

    if category:
        clauses.append("lower(material.category) = lower(:category)")
        params["category"] = category

    if flag is not None:
        clauses.append("material.is_flagged = :flag")
        params["flag"] = flag

    if v_needs_update is not None:
        clauses.append("nvl(material.v_needs_update, 0) = :v_needs_update")
        params["v_needs_update"] = v_needs_update

    append_user_visibility_clause(clauses, params, auth_context, "material.user_id")
    return clauses, params


async def list_english_materials(
    *,
    limit: int,
    offset: int,
    include_total: bool = True,
    q: str | None = None,
    semantic_query: str | None = None,
    username: str | None = None,
    category: str | None = None,
    flag: int | None = None,
    v_needs_update: int | None = None,
    sort_by: str = "id",
    sort_dir: str = "desc",
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    sort_column = SORT_COLUMNS.get(sort_by, "id")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    async with acquire_connection() as connection:
        clauses, params = _build_filters(q, semantic_query, category, flag, v_needs_update, auth_context)
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "material.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""

        count_sql = f"select count(*) from t_english material{where_sql}"
        similarity_sql = (
            "1 - vector_distance(material.v, vector_embedding(BGE_BASE using :semantic_query as data), cosine)"
            if semantic_query
            else "cast(null as binary_double)"
        )
        list_order_sql = (
            "similarity desc nulls last, material.english_id desc"
            if semantic_query
            else f"{sort_column} {sort_direction} nulls last, material.english_id desc"
        )
        list_sql = f"""
            select {LIST_COLUMNS.replace("cast(null as binary_double)", similarity_sql)}
            from t_english material
            {where_sql}
            order by {list_order_sql}
            offset :offset rows fetch next :limit rows only
        """
        cursor = connection.cursor()
        total = 0
        if include_total:
            await cursor.execute(count_sql, params)
            count_row = await cursor.fetchone()
            total = int(count_row[0]) if count_row else 0

        list_params = {**params, "offset": offset, "limit": limit}
        if semantic_query:
            list_params["semantic_query"] = semantic_query
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    items = [_row_to_dict(row) for row in rows]
    return items, total if include_total else len(items)


async def refresh_english_vectors() -> None:
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute("begin pkg_ai_assistant.refresh_english_vectors; end;")
        await connection.commit()


async def get_english_material(material_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    params: dict[str, Any] = {"material_id": material_id}
    clauses = ["material.english_id = :material_id"]
    if auth_context is not None:
        append_user_visibility_clause(clauses, params, auth_context, "material.user_id")
    sql = f"""
        select {LIST_COLUMNS}
        from t_english material
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_english_material(payload: EnglishMaterialCreate, auth_context: AuthContext) -> dict[str, Any]:
    sql = """
        insert into t_english (
            sequence_no,
            category,
            base_expression,
            professional_sentence,
            chinese_translation,
            full_script,
            is_flagged,
            title,
            card_sections,
            user_id,
            v_needs_update
        ) values (
            :sequence_no,
            :category,
            :base_expression,
            :professional_sentence,
            :chinese_translation,
            :full_script,
            :flag,
            :title,
            case when :card_sections is null then null else json(:card_sections) end,
            :user_id,
            case when :full_script is null then 0 else 1 end
        )
        returning english_id into :new_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            sql,
            {
                "sequence_no": payload.sequence_no,
                "category": payload.category,
                "base_expression": payload.base_expression,
                "professional_sentence": payload.professional_sentence,
                "chinese_translation": payload.chinese_translation,
                "full_script": payload.full_script,
                "flag": payload.flag,
                "title": payload.title,
                "card_sections": json.dumps(payload.card_sections.model_dump(mode="json"), ensure_ascii=False) if payload.card_sections else None,
                "user_id": user_id_for_write(auth_context),
                "new_id": new_id,
            },
        )
        await connection.commit()
        material_id = int(new_id.getvalue()[0])

    created = await get_english_material(material_id, auth_context)
    if created is None:
        raise RuntimeError("English material row was inserted but could not be reloaded")
    return created


async def update_english_material(
    material_id: int,
    payload: EnglishMaterialUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_english_material(material_id, auth_context)

    assignments = [
        "card_sections = case when :card_sections is null then null else json(:card_sections) end"
        if key == "card_sections"
        else f"{UPDATE_COLUMNS[key]} = :{key}"
        for key in values
    ]
    assignments.append("updated_at = systimestamp")
    params = {
        **values,
        "material_id": material_id,
    }
    if "card_sections" in values and values["card_sections"] is not None:
        params["card_sections"] = json.dumps(values["card_sections"], ensure_ascii=False)
    lock_params: dict[str, Any] = {"material_id": material_id}
    clauses = ["english_id = :material_id"]
    append_user_visibility_clause(clauses, lock_params, auth_context, "user_id")
    update_clauses = ["english_id = :material_id"]
    append_user_visibility_clause(update_clauses, params, auth_context, "user_id")
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        if "full_script" in values:
            await cursor.execute(
                f"select full_script from t_english where {' and '.join(clauses)} for update",
                lock_params,
            )
            current = await cursor.fetchone()
            if current is None:
                await connection.rollback()
                return None
            if current[0] != values["full_script"]:
                if values["full_script"] is None:
                    assignments.extend(["v = null", "v_needs_update = 0"])
                else:
                    assignments.extend(["v = null", "v_needs_update = 1"])
        sql = f"""
            update t_english
            set {", ".join(assignments)}
            where {" and ".join(update_clauses)}
        """
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_english_material(material_id, auth_context)
