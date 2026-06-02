from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.schemas.blog_factory import BlogFactoryCreate


_table_ready = False


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "knowledge_id": row[1],
        "task_content": row[2],
        "question_snapshot": row[3],
        "answer_snapshot": row[4],
        "source_snapshot": row[5],
        "topic_tag_snapshot": row[6],
        "blog_status_snapshot": row[7],
        "copied_at": row[8],
    }


async def _ensure_blog_factory_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_blog_factory (
                    id number generated always as identity primary key,
                    knowledge_id number not null,
                    task_content clob not null,
                    question_snapshot clob not null,
                    answer_snapshot clob not null,
                    source_snapshot varchar2(200),
                    topic_tag_snapshot varchar2(100),
                    blog_status_snapshot varchar2(20),
                    copied_at timestamp default systimestamp not null
                )
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate '
                create index ai_blog_factory_kid_idx
                on ai_blog_factory (knowledge_id, copied_at)
            ';
        exception
            when others then
                if sqlcode != -955 then
                    raise;
                end if;
        end;
        """
    )
    _table_ready = True


async def get_blog_factory_item(item_id: int) -> dict[str, Any] | None:
    sql = """
        select
            id,
            knowledge_id,
            task_content,
            question_snapshot,
            answer_snapshot,
            source_snapshot,
            topic_tag_snapshot,
            blog_status_snapshot,
            copied_at
        from ai_blog_factory
        where id = :item_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, {"item_id": item_id})
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_blog_factory_item(payload: BlogFactoryCreate) -> dict[str, Any] | None:
    select_sql = """
        select
            question,
            answer,
            source,
            topic_tag,
            blog_status
        from ai_qa_lib
        where id = :knowledge_id
    """
    insert_sql = """
        insert into ai_blog_factory (
            knowledge_id,
            task_content,
            question_snapshot,
            answer_snapshot,
            source_snapshot,
            topic_tag_snapshot,
            blog_status_snapshot
        ) values (
            :knowledge_id,
            :task_content,
            :question_snapshot,
            :answer_snapshot,
            :source_snapshot,
            :topic_tag_snapshot,
            :blog_status_snapshot
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(select_sql, {"knowledge_id": payload.knowledge_id})
        source_row = await cursor.fetchone()
        if source_row is None:
            return None

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            insert_sql,
            {
                "knowledge_id": payload.knowledge_id,
                "task_content": payload.task_content,
                "question_snapshot": source_row[0],
                "answer_snapshot": source_row[1],
                "source_snapshot": source_row[2],
                "topic_tag_snapshot": source_row[3],
                "blog_status_snapshot": source_row[4],
                "new_id": new_id,
            },
        )
        await connection.commit()
        item_id = int(new_id.getvalue()[0])

    created = await get_blog_factory_item(item_id)
    if created is None:
        raise RuntimeError("Blog factory row was inserted but could not be reloaded")
    return created
