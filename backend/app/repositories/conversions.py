from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.repositories.knowledge import get_knowledge_by_id
from app.repositories.todos import _ensure_todo_table, get_todo_by_id
from app.repositories.users import AuthContext, append_user_visibility_clause


async def convert_knowledge_to_todo(knowledge_id: int, auth_context: AuthContext) -> dict[str, Any] | None:
    params: dict[str, Any] = {"knowledge_id": knowledge_id}
    clauses = ["id = :knowledge_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    select_sql = f"""
        select question, answer, source, topic_tag, user_id
        from ai_qa_lib
        where {" and ".join(clauses)}
        for update
    """
    insert_sql = """
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
            '待处理'
        )
        returning id into :new_id
    """
    delete_sql = f"delete from ai_qa_lib where {' and '.join(clauses)}"

    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        try:
            await cursor.execute(select_sql, params)
            source_row = await cursor.fetchone()
            if source_row is None:
                await connection.rollback()
                return None

            new_id = cursor.var(oracledb.NUMBER)
            await cursor.execute(
                insert_sql,
                {
                    "title": source_row[0],
                    "content": source_row[1],
                    "source": source_row[2],
                    "topic_tag": source_row[3],
                    "user_id": source_row[4],
                    "new_id": new_id,
                },
            )
            todo_id = int(new_id.getvalue()[0])

            await cursor.execute(delete_sql, params)
            if cursor.rowcount != 1:
                await connection.rollback()
                return None

            await connection.commit()
        except Exception:
            await connection.rollback()
            raise

    converted = await get_todo_by_id(todo_id, auth_context)
    if converted is None:
        raise RuntimeError("Converted todo row was inserted but could not be reloaded")
    return converted


async def convert_todo_to_knowledge(todo_id: int, auth_context: AuthContext) -> dict[str, Any] | None:
    params: dict[str, Any] = {"todo_id": todo_id}
    clauses = ["id = :todo_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    select_sql = f"""
        select title, content, source, topic_tag, user_id
        from ai_todo_items
        where {" and ".join(clauses)}
        for update
    """
    insert_sql = """
        insert into ai_qa_lib (
            question,
            answer,
            source,
            topic_tag,
            user_id,
            blog_status
        ) values (
            :question,
            :answer,
            :source,
            :topic_tag,
            :user_id,
            '未发布'
        )
        returning id into :new_id
    """
    delete_sql = f"delete from ai_todo_items where {' and '.join(clauses)}"

    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        try:
            await cursor.execute(select_sql, params)
            source_row = await cursor.fetchone()
            if source_row is None:
                await connection.rollback()
                return None

            new_id = cursor.var(oracledb.NUMBER)
            await cursor.execute(
                insert_sql,
                {
                    "question": source_row[0],
                    "answer": source_row[1],
                    "source": source_row[2],
                    "topic_tag": source_row[3],
                    "user_id": source_row[4],
                    "new_id": new_id,
                },
            )
            knowledge_id = int(new_id.getvalue()[0])

            await cursor.execute(delete_sql, params)
            if cursor.rowcount != 1:
                await connection.rollback()
                return None

            await connection.commit()
        except Exception:
            await connection.rollback()
            raise

    converted = await get_knowledge_by_id(knowledge_id, auth_context)
    if converted is None:
        raise RuntimeError("Converted knowledge row was inserted but could not be reloaded")
    return converted
