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
    material.id,
    material."序号",
    material."分类标识",
    material."基础表达",
    material."职业完整句式",
    material."地道中文翻译",
    material."完整口播内容",
    material.flag,
    material.title
"""

SORT_COLUMNS = {
    "id": "material.id",
    "sequence_no": 'material."序号"',
    "category": 'material."分类标识"',
    "base_expression": 'material."基础表达"',
    "title": "material.title",
    "flag": "material.flag",
}

UPDATE_COLUMNS = {
    "sequence_no": '"序号"',
    "category": '"分类标识"',
    "base_expression": '"基础表达"',
    "professional_sentence": '"职业完整句式"',
    "chinese_translation": '"地道中文翻译"',
    "full_script": '"完整口播内容"',
    "flag": "flag",
    "title": "title",
}


def _row_to_dict(row: Any) -> dict[str, Any]:
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
    }


def _build_filters(
    q: str | None,
    category: str | None,
    flag: int | None,
    auth_context: AuthContext,
) -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(material.title) like '%' || lower(:q) || '%' "
            "or lower(material.\"分类标识\") like '%' || lower(:q) || '%' "
            "or lower(material.\"基础表达\") like '%' || lower(:q) || '%' "
            "or lower(material.\"职业完整句式\") like '%' || lower(:q) || '%' "
            "or lower(material.\"地道中文翻译\") like '%' || lower(:q) || '%' "
            "or lower(material.\"完整口播内容\") like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if category:
        clauses.append("lower(material.\"分类标识\") = lower(:category)")
        params["category"] = category

    if flag is not None:
        clauses.append("material.flag = :flag")
        params["flag"] = flag

    append_user_visibility_clause(clauses, params, auth_context, "material.user_id")
    return clauses, params


async def list_english_materials(
    *,
    limit: int,
    offset: int,
    include_total: bool = True,
    q: str | None = None,
    username: str | None = None,
    category: str | None = None,
    flag: int | None = None,
    sort_by: str = "id",
    sort_dir: str = "desc",
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    sort_column = SORT_COLUMNS.get(sort_by, "id")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    async with acquire_connection() as connection:
        clauses, params = _build_filters(q, category, flag, auth_context)
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "material.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""

        count_sql = f"select count(*) from t_douyin_details material{where_sql}"
        list_sql = f"""
            select {LIST_COLUMNS}
            from t_douyin_details material
            {where_sql}
            order by {sort_column} {sort_direction} nulls last, material.id desc
            offset :offset rows fetch next :limit rows only
        """
        cursor = connection.cursor()
        total = 0
        if include_total:
            await cursor.execute(count_sql, params)
            count_row = await cursor.fetchone()
            total = int(count_row[0]) if count_row else 0

        await cursor.execute(list_sql, {**params, "offset": offset, "limit": limit})
        rows = await cursor.fetchall()

    items = [_row_to_dict(row) for row in rows]
    return items, total if include_total else len(items)


async def get_english_material(material_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    params: dict[str, Any] = {"material_id": material_id}
    clauses = ["material.id = :material_id"]
    if auth_context is not None:
        append_user_visibility_clause(clauses, params, auth_context, "material.user_id")
    sql = f"""
        select {LIST_COLUMNS}
        from t_douyin_details material
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_english_material(payload: EnglishMaterialCreate, auth_context: AuthContext) -> dict[str, Any]:
    sql = """
        insert into t_douyin_details (
            "序号",
            "分类标识",
            "基础表达",
            "职业完整句式",
            "地道中文翻译",
            "完整口播内容",
            flag,
            title,
            user_id
        ) values (
            :sequence_no,
            :category,
            :base_expression,
            :professional_sentence,
            :chinese_translation,
            :full_script,
            :flag,
            :title,
            :user_id
        )
        returning id into :new_id
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

    assignments = [f"{UPDATE_COLUMNS[key]} = :{key}" for key in values]
    params = {**values, "material_id": material_id}
    clauses = ["id = :material_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"""
        update t_douyin_details
        set {", ".join(assignments)}
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_english_material(material_id, auth_context)
