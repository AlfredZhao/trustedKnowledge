import hashlib
import re
from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.schemas.blog_factory import (
    BlogFactoryArticleUpdate,
    BlogFactoryContentStatusUpdate,
    BlogFactoryCreate,
    BlogFactoryStatusUpdate,
    BlogFactoryUpdate,
)


COMMON_COLUMNS = """
    id,
    knowledge_id,
    task_content,
    question_snapshot,
    answer_snapshot,
    source_snapshot,
    topic_tag_snapshot,
    blog_status_snapshot,
    copied_at,
    nvl(factory_status, '待处理'),
    article_title,
    article_file_path,
    article_checksum,
    article_saved_at,
    case when article_markdown is null then 0 else 1 end
"""

DETAIL_COLUMNS = f"""
    {COMMON_COLUMNS},
    article_markdown
"""

SORT_COLUMNS = {
    "copied_at": "copied_at",
    "id": "id",
    "knowledge_id": "knowledge_id",
    "factory_status": "factory_status",
}


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
        "factory_status": row[9],
        "article_title": row[10],
        "article_file_path": row[11],
        "article_checksum": row[12],
        "article_saved_at": row[13],
        "has_article": bool(row[14]),
        "article_markdown": row[15] if len(row) > 15 else None,
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
                    copied_at timestamp default systimestamp not null,
                    factory_status varchar2(20) default ''待处理'' not null
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
    await _add_column_if_missing(cursor, "factory_status varchar2(20) default '待处理' not null")
    await _add_column_if_missing(cursor, "article_markdown clob")
    await _add_column_if_missing(cursor, "article_title varchar2(300)")
    await _add_column_if_missing(cursor, "article_file_path varchar2(500)")
    await _add_column_if_missing(cursor, "article_checksum varchar2(64)")
    await _add_column_if_missing(cursor, "article_saved_at timestamp")
    _table_ready = True


async def _add_column_if_missing(cursor: Any, column_definition: str) -> None:
    ddl = column_definition.replace("'", "''")
    await cursor.execute(
        f"""
        begin
            execute immediate '
                alter table ai_blog_factory
                add {ddl}
            ';
        exception
            when others then
                if sqlcode != -1430 then
                    raise;
                end if;
        end;
        """
    )


def _build_filters(
    q: str | None,
    factory_status: str | None,
    topic: str | None,
    knowledge_id: int | None,
) -> tuple[str, dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(dbms_lob.substr(task_content, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(question_snapshot, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(answer_snapshot, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(article_markdown, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(article_title) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if factory_status:
        clauses.append("factory_status = :factory_status")
        params["factory_status"] = factory_status

    if topic:
        clauses.append("lower(topic_tag_snapshot) like '%' || lower(:topic) || '%'")
        params["topic"] = topic

    if knowledge_id is not None:
        clauses.append("knowledge_id = :knowledge_id")
        params["knowledge_id"] = knowledge_id

    if not clauses:
        return "", params

    return " where " + " and ".join(clauses), params


async def list_blog_factory_items(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    factory_status: str | None = None,
    topic: str | None = None,
    knowledge_id: int | None = None,
    sort_by: str = "copied_at",
    sort_dir: str = "desc",
) -> tuple[list[dict[str, Any]], int]:
    where_sql, params = _build_filters(q, factory_status, topic, knowledge_id)
    sort_column = SORT_COLUMNS.get(sort_by, "copied_at")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    count_sql = f"select count(*) from ai_blog_factory{where_sql}"
    list_sql = f"""
        select {COMMON_COLUMNS}
        from ai_blog_factory
        {where_sql}
        order by {sort_column} {sort_direction} nulls last, id desc
        offset :offset rows fetch next :limit rows only
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(count_sql, params)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        list_params = {**params, "offset": offset, "limit": limit}
        await cursor.execute(list_sql, list_params)
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows], total


async def get_blog_factory_item(item_id: int) -> dict[str, Any] | None:
    sql = f"""
        select {DETAIL_COLUMNS}
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
            blog_status_snapshot,
            factory_status
        ) values (
            :knowledge_id,
            :task_content,
            :question_snapshot,
            :answer_snapshot,
            :source_snapshot,
            :topic_tag_snapshot,
            :blog_status_snapshot,
            :factory_status
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
                "factory_status": "待处理",
                "new_id": new_id,
            },
        )
        await connection.commit()
        item_id = int(new_id.getvalue()[0])

    created = await get_blog_factory_item(item_id)
    if created is None:
        raise RuntimeError("Blog factory row was inserted but could not be reloaded")
    return created


async def update_blog_factory_status(item_id: int, payload: BlogFactoryStatusUpdate) -> dict[str, Any] | None:
    sql = """
        update ai_blog_factory
        set factory_status = :factory_status
        where id = :item_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, {"item_id": item_id, "factory_status": payload.factory_status})
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id)


async def update_blog_factory_item(item_id: int, payload: BlogFactoryUpdate) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_blog_factory_item(item_id)

    assignments = [f"{column} = :{column}" for column in values]
    params = {**values, "item_id": item_id}
    sql = f"""
        update ai_blog_factory
        set {", ".join(assignments)}
        where id = :item_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id)


async def update_blog_factory_content_status(
    item_id: int,
    payload: BlogFactoryContentStatusUpdate,
) -> dict[str, Any] | None:
    select_sql = """
        select knowledge_id
        from ai_blog_factory
        where id = :item_id
        for update
    """
    update_knowledge_sql = """
        update ai_qa_lib
        set blog_status = :blog_status
        where id = :knowledge_id
    """
    update_factory_sql = """
        update ai_blog_factory
        set blog_status_snapshot = :blog_status
        where knowledge_id = :knowledge_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(select_sql, {"item_id": item_id})
        row = await cursor.fetchone()
        if row is None:
            await connection.rollback()
            return None

        knowledge_id = row[0]
        await cursor.execute(
            update_knowledge_sql,
            {"knowledge_id": knowledge_id, "blog_status": payload.blog_status},
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None

        await cursor.execute(
            update_factory_sql,
            {"knowledge_id": knowledge_id, "blog_status": payload.blog_status},
        )
        await connection.commit()

    return await get_blog_factory_item(item_id)


async def update_blog_factory_article(item_id: int, payload: BlogFactoryArticleUpdate) -> dict[str, Any] | None:
    title = _extract_article_title(payload.article_markdown)
    checksum = hashlib.sha256(payload.article_markdown.encode("utf-8")).hexdigest()
    sql = """
        update ai_blog_factory
        set article_markdown = :article_markdown,
            article_title = :article_title,
            article_file_path = :article_file_path,
            article_checksum = :article_checksum,
            article_saved_at = systimestamp,
            factory_status = case
                when factory_status = '待处理' then '已处理'
                else factory_status
            end
        where id = :item_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(
            sql,
            {
                "item_id": item_id,
                "article_markdown": payload.article_markdown,
                "article_title": title,
                "article_file_path": payload.article_file_path,
                "article_checksum": checksum,
            },
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id)


async def delete_blog_factory_item(item_id: int) -> bool:
    sql = "delete from ai_blog_factory where id = :item_id"

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, {"item_id": item_id})
        if cursor.rowcount == 0:
            await connection.rollback()
            return False
        await connection.commit()

    return True


def _extract_article_title(markdown: str) -> str | None:
    for line in markdown.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return match.group(1).strip()[:300]
    return None
