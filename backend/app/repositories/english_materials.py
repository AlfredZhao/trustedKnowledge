from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.schemas.english_materials import EnglishMaterialCreate


LIST_COLUMNS = """
    id,
    "序号",
    "分类标识",
    "基础表达",
    "职业完整句式",
    "地道中文翻译",
    "完整口播内容",
    flag,
    title
"""

SORT_COLUMNS = {
    "id": "id",
    "sequence_no": '"序号"',
    "category": '"分类标识"',
    "base_expression": '"基础表达"',
    "title": "title",
    "flag": "flag",
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
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(title) like '%' || lower(:q) || '%' "
            "or lower(\"分类标识\") like '%' || lower(:q) || '%' "
            "or lower(\"基础表达\") like '%' || lower(:q) || '%' "
            "or lower(\"职业完整句式\") like '%' || lower(:q) || '%' "
            "or lower(\"地道中文翻译\") like '%' || lower(:q) || '%' "
            "or lower(\"完整口播内容\") like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if category:
        clauses.append("lower(\"分类标识\") = lower(:category)")
        params["category"] = category

    if flag is not None:
        clauses.append("flag = :flag")
        params["flag"] = flag

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_english_materials(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    category: str | None = None,
    flag: int | None = None,
    sort_by: str = "id",
    sort_dir: str = "desc",
) -> tuple[list[dict[str, Any]], int]:
    where_sql, params = _build_filters(q, category, flag)
    sort_column = SORT_COLUMNS.get(sort_by, "id")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    count_sql = f"select count(*) from t_douyin_details{where_sql}"
    list_sql = f"""
        select {LIST_COLUMNS}
        from t_douyin_details
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


async def get_english_material(material_id: int) -> dict[str, Any] | None:
    sql = f"""
        select {LIST_COLUMNS}
        from t_douyin_details
        where id = :material_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, {"material_id": material_id})
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_english_material(payload: EnglishMaterialCreate) -> dict[str, Any]:
    sql = """
        insert into t_douyin_details (
            "序号",
            "分类标识",
            "基础表达",
            "职业完整句式",
            "地道中文翻译",
            "完整口播内容",
            flag,
            title
        ) values (
            :sequence_no,
            :category,
            :base_expression,
            :professional_sentence,
            :chinese_translation,
            :full_script,
            :flag,
            :title
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
                "new_id": new_id,
            },
        )
        await connection.commit()
        material_id = int(new_id.getvalue()[0])

    created = await get_english_material(material_id)
    if created is None:
        raise RuntimeError("English material row was inserted but could not be reloaded")
    return created
