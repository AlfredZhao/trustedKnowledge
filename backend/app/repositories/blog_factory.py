import hashlib
import logging
import re
from typing import Any

import oracledb

from app.db.oracle import acquire_connection
from app.repositories.users import AuthContext, append_requested_username_clause, append_user_visibility_clause
from app.schemas.blog_factory import (
    BlogFactoryArticleUpdate,
    BlogFactoryContentStatusUpdate,
    BlogFactoryCreate,
    BlogFactoryStatusUpdate,
    BlogFactoryUpdate,
)


COMMON_COLUMNS = """
    factory_item.id,
    factory_item.knowledge_id,
    factory_item.task_content,
    factory_item.question_snapshot,
    factory_item.answer_snapshot,
    factory_item.source_snapshot,
    factory_item.topic_tag_snapshot,
    factory_item.blog_status_snapshot,
    factory_item.copied_at,
    nvl(factory_item.factory_status, '待处理'),
    factory_item.article_title,
    factory_item.article_file_path,
    factory_item.article_checksum,
    factory_item.article_saved_at,
    factory_item.remote_post_id,
    factory_item.remote_publish_config_id,
    factory_item.remote_publish_state,
    factory_item.remote_submission_option,
    factory_item.remote_categories_snapshot,
    factory_item.remote_tags_snapshot,
    factory_item.remote_published_at,
    factory_item.remote_last_synced_at,
    case when factory_item.article_markdown is null then 0 else 1 end
"""

DETAIL_COLUMNS = f"""
    {COMMON_COLUMNS},
    factory_item.article_markdown
"""

SORT_COLUMNS = {
    "copied_at": "factory_item.copied_at",
    "id": "factory_item.id",
    "knowledge_id": "factory_item.knowledge_id",
    "factory_status": "factory_item.factory_status",
}


_table_ready = False
logger = logging.getLogger(__name__)


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
        "remote_post_id": row[14],
        "remote_publish_config_id": row[15],
        "remote_publish_state": row[16],
        "remote_submission_option": row[17],
        "remote_categories_snapshot": row[18],
        "remote_tags_snapshot": row[19],
        "remote_published_at": row[20],
        "remote_last_synced_at": row[21],
        "has_article": bool(row[22]),
        "article_markdown": row[23] if len(row) > 23 else None,
    }


async def _mark_knowledge_as_published(cursor: Any, knowledge_id: int, user_id: int | None) -> None:
    await cursor.execute(
        """
        update ai_qa_lib
        set blog_status = '已发布'
        where id = :knowledge_id
          and ((user_id = :user_id) or (user_id is null and :user_id is null))
        """,
        {"knowledge_id": knowledge_id, "user_id": user_id},
    )
    await cursor.execute(
        """
        update ai_blog_factory
        set blog_status_snapshot = '已发布'
        where knowledge_id = :knowledge_id
          and ((user_id = :user_id) or (user_id is null and :user_id is null))
        """,
        {"knowledge_id": knowledge_id, "user_id": user_id},
    )


async def _ensure_blog_factory_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    logger.info("Ensuring Oracle table ai_blog_factory exists")
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
                    user_id number,
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
    logger.info("Ensuring Oracle index ai_blog_factory_kid_idx exists")
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
    await _add_column_if_missing(cursor, "user_id number")
    await _add_column_if_missing(cursor, "remote_post_id varchar2(100)")
    await _add_column_if_missing(cursor, "remote_publish_config_id number")
    await _add_column_if_missing(cursor, "remote_publish_state varchar2(20)")
    await _add_column_if_missing(cursor, "remote_submission_option varchar2(30)")
    await _add_column_if_missing(cursor, "remote_categories_snapshot varchar2(2000)")
    await _add_column_if_missing(cursor, "remote_tags_snapshot varchar2(2000)")
    await _add_column_if_missing(cursor, "remote_published_at timestamp")
    await _add_column_if_missing(cursor, "remote_last_synced_at timestamp")
    _table_ready = True


async def _add_column_if_missing(cursor: Any, column_definition: str) -> None:
    ddl = column_definition.replace("'", "''")
    logger.info("Ensuring Oracle column ai_blog_factory.%s exists", column_definition.split()[0])
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
    auth_context: AuthContext,
) -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if q:
        clauses.append(
            "(lower(dbms_lob.substr(factory_item.task_content, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(factory_item.question_snapshot, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(factory_item.answer_snapshot, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(dbms_lob.substr(factory_item.article_markdown, 4000, 1)) like '%' || lower(:q) || '%' "
            "or lower(factory_item.article_title) like '%' || lower(:q) || '%')"
        )
        params["q"] = q

    if factory_status:
        clauses.append("factory_item.factory_status = :factory_status")
        params["factory_status"] = factory_status

    if topic:
        clauses.append("lower(factory_item.topic_tag_snapshot) like '%' || lower(:topic) || '%'")
        params["topic"] = topic

    if knowledge_id is not None:
        clauses.append("factory_item.knowledge_id = :knowledge_id")
        params["knowledge_id"] = knowledge_id

    append_user_visibility_clause(clauses, params, auth_context, "factory_item.user_id")
    return clauses, params


async def list_blog_factory_items(
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    username: str | None = None,
    factory_status: str | None = None,
    topic: str | None = None,
    knowledge_id: int | None = None,
    sort_by: str = "copied_at",
    sort_dir: str = "desc",
    auth_context: AuthContext,
) -> tuple[list[dict[str, Any]], int]:
    sort_column = SORT_COLUMNS.get(sort_by, "copied_at")
    sort_direction = "asc" if sort_dir == "asc" else "desc"

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        clauses, params = _build_filters(q, factory_status, topic, knowledge_id, auth_context)
        await append_requested_username_clause(
            connection,
            clauses,
            params,
            auth_context,
            username,
            "factory_item.user_id",
        )
        where_sql = f" where {' and '.join(clauses)}" if clauses else ""

        count_sql = f"select count(*) from ai_blog_factory factory_item{where_sql}"
        list_sql = f"""
            select {COMMON_COLUMNS}
            from ai_blog_factory factory_item
            {where_sql}
            order by {sort_column} {sort_direction} nulls last, factory_item.id desc
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


async def get_blog_factory_item(item_id: int, auth_context: AuthContext | None = None) -> dict[str, Any] | None:
    params: dict[str, Any] = {"item_id": item_id}
    clauses = ["factory_item.id = :item_id"]
    if auth_context is not None:
        append_user_visibility_clause(clauses, params, auth_context, "factory_item.user_id")
    sql = f"""
        select {DETAIL_COLUMNS}
        from ai_blog_factory factory_item
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        row = await cursor.fetchone()

    return _row_to_dict(row) if row else None


async def create_blog_factory_item(payload: BlogFactoryCreate, auth_context: AuthContext) -> dict[str, Any] | None:
    visibility_clauses: list[str] = []
    visibility_params: dict[str, Any] = {}
    append_user_visibility_clause(visibility_clauses, visibility_params, auth_context, "user_id")
    visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
    select_sql = f"""
        select
            question,
            answer,
            source,
            topic_tag,
            blog_status,
            user_id
        from ai_qa_lib
        where id = :knowledge_id
        {visibility_sql}
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
            user_id,
            factory_status
        ) values (
            :knowledge_id,
            :task_content,
            :question_snapshot,
            :answer_snapshot,
            :source_snapshot,
            :topic_tag_snapshot,
            :blog_status_snapshot,
            :user_id,
            :factory_status
        )
        returning id into :new_id
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(select_sql, {"knowledge_id": payload.knowledge_id, **visibility_params})
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
                "user_id": source_row[5],
                "factory_status": "待处理",
                "new_id": new_id,
            },
        )
        await _mark_knowledge_as_published(cursor, payload.knowledge_id, source_row[5])
        await connection.commit()
        item_id = int(new_id.getvalue()[0])

    created = await get_blog_factory_item(item_id, auth_context)
    if created is None:
        raise RuntimeError("Blog factory row was inserted but could not be reloaded")
    return created


async def update_blog_factory_status(
    item_id: int,
    payload: BlogFactoryStatusUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {"item_id": item_id, "factory_status": payload.factory_status}
    clauses = ["id = :item_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"""
        update ai_blog_factory
        set factory_status = :factory_status
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id, auth_context)


async def update_blog_factory_item(
    item_id: int,
    payload: BlogFactoryUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return await get_blog_factory_item(item_id, auth_context)

    assignments = [f"{column} = :{column}" for column in values]
    params = {**values, "item_id": item_id}
    clauses = ["id = :item_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"""
        update ai_blog_factory
        set {", ".join(assignments)}
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id, auth_context)


async def update_blog_factory_content_status(
    item_id: int,
    payload: BlogFactoryContentStatusUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {"item_id": item_id}
    clauses = ["id = :item_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    select_sql = f"""
        select knowledge_id, user_id
        from ai_blog_factory
        where {" and ".join(clauses)}
        for update
    """
    update_knowledge_sql = """
        update ai_qa_lib
        set blog_status = :blog_status
        where id = :knowledge_id
          and ((user_id = :user_id) or (user_id is null and :user_id is null))
    """
    update_factory_sql = """
        update ai_blog_factory
        set blog_status_snapshot = :blog_status
        where knowledge_id = :knowledge_id
          and ((user_id = :user_id) or (user_id is null and :user_id is null))
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(select_sql, params)
        row = await cursor.fetchone()
        if row is None:
            await connection.rollback()
            return None

        knowledge_id = row[0]
        user_id = row[1]
        await cursor.execute(
            update_knowledge_sql,
            {"knowledge_id": knowledge_id, "blog_status": payload.blog_status, "user_id": user_id},
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None

        await cursor.execute(
            update_factory_sql,
            {"knowledge_id": knowledge_id, "blog_status": payload.blog_status, "user_id": user_id},
        )
        await connection.commit()

    return await get_blog_factory_item(item_id, auth_context)


async def update_blog_factory_article(
    item_id: int,
    payload: BlogFactoryArticleUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    title = _extract_article_title(payload.article_markdown)
    checksum = hashlib.sha256(payload.article_markdown.encode("utf-8")).hexdigest()
    params: dict[str, Any] = {
        "item_id": item_id,
        "article_markdown": payload.article_markdown,
        "article_title": title,
        "article_file_path": payload.article_file_path,
        "article_checksum": checksum,
    }
    clauses = ["id = :item_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"""
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
        where {" and ".join(clauses)}
    """

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(
            sql,
            params,
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await connection.commit()

    return await get_blog_factory_item(item_id, auth_context)


async def delete_blog_factory_item(item_id: int, auth_context: AuthContext) -> bool:
    params: dict[str, Any] = {"item_id": item_id}
    clauses = ["id = :item_id"]
    append_user_visibility_clause(clauses, params, auth_context, "user_id")
    sql = f"delete from ai_blog_factory where {' and '.join(clauses)}"

    async with acquire_connection() as connection:
        await _ensure_blog_factory_table(connection)
        cursor = connection.cursor()
        await cursor.execute(sql, params)
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
