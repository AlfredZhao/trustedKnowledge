from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.schemas.knowledge import KnowledgeCreate, KnowledgeUpdate


LIST_COLUMNS = """
    id,
    question,
    answer,
    source,
    topic_tag,
    created_date,
    blog_status
"""


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "question": row[1],
        "answer": row[2],
        "source": row[3],
        "topic_tag": row[4],
        "created_date": row[5],
        "blog_status": row[6],
    }


def _build_filters(
    q: str | None,
    topic: str | None,
    source: str | None,
    status: str | None,
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(question) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(answer, 4000, 1)) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if topic:
        clauses.append("lower(topic_tag) like '%' || lower(:topic) || '%'")
        params["topic"] = topic

    if source:
        clauses.append("lower(source) = lower(:source)")
        params["source"] = source

    if status:
        clauses.append("blog_status = :status")
        params["status"] = status

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_knowledge(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    topic: str | None = None,
    source: str | None = None,
    status: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    where_sql, params = _build_filters(q, topic, source, status)

    count_sql = f"select count(*) from ai_qa_lib{where_sql}"
    list_sql = f"""
        select {LIST_COLUMNS}
        from ai_qa_lib
        {where_sql}
        order by id desc
        offset :offset rows fetch next :limit rows only
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        list_params = {**params, "offset": offset, "limit": limit}
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows], total


async def get_knowledge_by_id(knowledge_id: int) -> dict[str, Any] | None:
    sql = f"""
        select {LIST_COLUMNS}
        from ai_qa_lib
        where id = :knowledge_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, {"knowledge_id": knowledge_id})
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_knowledge(payload: KnowledgeCreate) -> dict[str, Any]:
    sql = """
        insert into ai_qa_lib (
            question,
            answer,
            source,
            topic_tag,
            blog_status
        ) values (
            :question,
            :answer,
            :source,
            :topic_tag,
            :blog_status
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            sql,
            {
                "question": payload.question,
                "answer": payload.answer,
                "source": payload.source,
                "topic_tag": payload.topic_tag,
                "blog_status": payload.blog_status,
                "new_id": new_id,
            },
        )
        await connection.commit()
        knowledge_id = int(new_id.getvalue()[0])

    created = await get_knowledge_by_id(knowledge_id)
    if created is None:
        raise RuntimeError("Knowledge row was inserted but could not be reloaded")
    return created


async def update_knowledge(knowledge_id: int, payload: KnowledgeUpdate) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_knowledge_by_id(knowledge_id)

    assignments = [f"{column} = :{column}" for column in values]
    params = {**values, "knowledge_id": knowledge_id}
    sql = f"""
        update ai_qa_lib
        set {", ".join(assignments)}
        where id = :knowledge_id
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_knowledge_by_id(knowledge_id)


async def delete_knowledge(knowledge_id: int) -> bool:
    sql = "delete from ai_qa_lib where id = :knowledge_id"

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, {"knowledge_id": knowledge_id})
        if cursor.rowcount == 0:
            await connection.rollback()
            return False
        await connection.commit()

    return True
