from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.repositories.users import (
    AuthContext,
    append_requested_username_clause,
    append_user_visibility_clause,
    user_id_for_write,
)
from app.schemas.knowledge import KnowledgeCreate, KnowledgeMergeRequest, KnowledgeUpdate


LIST_COLUMNS = """
    knowledge_record.id,
    knowledge_record.question,
    knowledge_record.answer,
    knowledge_record.source,
    knowledge_record.topic_tag,
    knowledge_record.created_date,
    knowledge_record.blog_status
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
    auth_context: AuthContext,
) -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(knowledge_record.question) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(knowledge_record.answer, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(knowledge_record.source) like '%' || lower(:q) || '%' "
            "or lower(knowledge_record.topic_tag) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if topic:
        clauses.append("lower(knowledge_record.topic_tag) like '%' || lower(:topic) || '%'")
        params["topic"] = topic

    if source:
        clauses.append("lower(knowledge_record.source) = lower(:source)")
        params["source"] = source

    if status:
        clauses.append("knowledge_record.blog_status = :status")
        params["status"] = status

    append_user_visibility_clause(clauses, params, auth_context, "knowledge_record.user_id")
    return clauses, params


async def list_knowledge(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    username: str | None = None,
    topic: str | None = None,
    source: str | None = None,
    status: str | None = None,
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    async with acquire_connection() as connection:
        clauses, params = _build_filters(q, topic, source, status, auth_context)
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "knowledge_record.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""

        count_sql = f"select count(*) from ai_qa_lib knowledge_record{where_sql}"
        list_sql = f"""
            select {LIST_COLUMNS}
            from ai_qa_lib knowledge_record
            {where_sql}
            order by knowledge_record.id desc
            offset :offset rows fetch next :limit rows only
        """
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        list_params = {**params, "offset": offset, "limit": limit}
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows], total


async def get_knowledge_by_id(knowledge_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    clauses = ["knowledge_record.id = :knowledge_id"]
    params: dict[str, Any] = {"knowledge_id": knowledge_id}
    if auth_context is not None:
        append_user_visibility_clause(clauses, params, auth_context, "knowledge_record.user_id")
    where_sql = " and ".join(clauses)
    sql = f"""
        select {LIST_COLUMNS}
        from ai_qa_lib knowledge_record
        where {where_sql}
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_knowledge(payload: KnowledgeCreate, auth_context: AuthContext) -> dict[str, Any]:
    sql = """
        insert into ai_qa_lib (
            question,
            answer,
            source,
            topic_tag,
            blog_status,
            user_id
        ) values (
            :question,
            :answer,
            :source,
            :topic_tag,
            :blog_status,
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
                "question": payload.question,
                "answer": payload.answer,
                "source": payload.source,
                "topic_tag": payload.topic_tag,
                "blog_status": payload.blog_status,
                "user_id": user_id_for_write(auth_context),
                "new_id": new_id,
            },
        )
        await connection.commit()
        knowledge_id = int(new_id.getvalue()[0])

    created = await get_knowledge_by_id(knowledge_id, auth_context)
    if created is None:
        raise RuntimeError("Knowledge row was inserted but could not be reloaded")
    return created


async def merge_knowledge(payload: KnowledgeMergeRequest, auth_context: AuthContext) -> dict[str, Any] | None:
    bind_names = [f"id_{index}" for index, _ in enumerate(payload.knowledge_ids)]
    id_params = dict(zip(bind_names, payload.knowledge_ids))
    id_list = ", ".join(f":{name}" for name in bind_names)

    visibility_clauses: list[str] = []
    visibility_params: dict[str, Any] = {}
    append_user_visibility_clause(visibility_clauses, visibility_params, auth_context, "user_id")
    visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
    source_sql = f"""
        select id, user_id
        from ai_qa_lib
        where blog_status = '未发布'
          and id in ({id_list})
          {visibility_sql}
        for update
    """
    insert_sql = """
        insert into ai_qa_lib (
            question,
            answer,
            source,
            topic_tag,
            blog_status,
            user_id
        ) values (
            :question,
            :answer,
            :source,
            :topic_tag,
            :blog_status,
            :user_id
        )
        returning id into :new_id
    """
    delete_sql = f"delete from ai_qa_lib where id in ({id_list})"

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(source_sql, {**id_params, **visibility_params})
        source_rows = await cursor.fetchall()
        if len(source_rows) != len(payload.knowledge_ids):
            await connection.rollback()
            return None

        source_user_ids = {row[1] for row in source_rows}
        merged_user_id = next(iter(source_user_ids)) if len(source_user_ids) == 1 else user_id_for_write(auth_context)

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            insert_sql,
            {
                "question": payload.question,
                "answer": payload.answer,
                "source": payload.source,
                "topic_tag": payload.topic_tag,
                "blog_status": payload.blog_status,
                "user_id": merged_user_id,
                "new_id": new_id,
            },
        )
        knowledge_id = int(new_id.getvalue()[0])

        await cursor.execute(delete_sql, id_params)
        if cursor.rowcount != len(payload.knowledge_ids):
            await connection.rollback()
            return None

        await connection.commit()

    created = await get_knowledge_by_id(knowledge_id, auth_context)
    if created is None:
        raise RuntimeError("Merged knowledge row was inserted but could not be reloaded")
    return created


async def update_knowledge(knowledge_id: int, payload: KnowledgeUpdate, auth_context: AuthContext) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_knowledge_by_id(knowledge_id, auth_context)

    assignments = [f"{column} = :{column}" for column in values]
    params = {**values, "knowledge_id": knowledge_id}
    clauses = ["id = :knowledge_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"""
        update ai_qa_lib
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

    return await get_knowledge_by_id(knowledge_id, auth_context)


async def delete_knowledge(knowledge_id: int, auth_context: AuthContext) -> bool:
    params: dict[str, Any] = {"knowledge_id": knowledge_id}
    clauses = ["id = :knowledge_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"delete from ai_qa_lib where {' and '.join(clauses)}"

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return False
        await connection.commit()

    return True
