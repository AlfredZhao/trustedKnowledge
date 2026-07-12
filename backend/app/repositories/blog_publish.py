from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import unquote, urlparse

import oracledb

from app.core.config import settings
from app.db.oracle import acquire_connection
from app.repositories.blog_factory import get_blog_factory_item
from app.repositories.media import get_media_content_for_cursor
from app.repositories.users import AuthContext, user_id_for_write
from app.schemas.blog_publish import BlogFactoryPublishRequest, BlogPublishConfigCreate, BlogPublishConfigUpdate
from app.services.metaweblog import (
    MetaWeblogLocalMedia,
    list_metaweblog_categories,
    publish_metaweblog_post,
    validate_metaweblog_config,
)


CONFIG_COLUMNS = """
    config_id,
    blog_type,
    blog_url,
    username,
    api_url,
    blog_name,
    blog_id,
    is_default,
    created_at,
    updated_at,
    case when password_value is null then 0 else 1 end
"""

_table_ready = False
logger = logging.getLogger(__name__)


class BlogPublishConfigNotFoundError(Exception):
    pass


class BlogFactoryPublishTargetNotFoundError(Exception):
    pass


def _row_to_config(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "blog_type": row[1],
        "blog_url": row[2],
        "username": row[3],
        "api_url": row[4],
        "blog_name": row[5],
        "blog_id": row[6],
        "is_default": bool(row[7]),
        "created_at": row[8],
        "updated_at": row[9],
        "has_password": bool(row[10]),
    }


async def list_blog_publish_configs(auth_context: AuthContext) -> list[dict[str, Any]]:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        owner_clause, params = _owner_clause(auth_context)
        await cursor.execute(
            f"""
            select {CONFIG_COLUMNS}
            from tk_blog_publish_configs
            where {owner_clause}
            order by is_default desc, updated_at desc nulls last, config_id desc
            """,
            params,
        )
        rows = await cursor.fetchall()
    return [_row_to_config(row) for row in rows]


async def create_blog_publish_config(payload: BlogPublishConfigCreate, auth_context: AuthContext) -> dict[str, Any]:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        owner_id = user_id_for_write(auth_context)
        owner_username = _normalize_owner_username(auth_context.username)
        should_be_default = payload.is_default or not await _owner_has_configs(cursor, owner_username)
        if should_be_default:
            await _clear_owner_default(cursor, owner_username)

        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into tk_blog_publish_configs (
                user_id,
                owner_username,
                blog_type,
                blog_url,
                username,
                password_value,
                api_url,
                blog_name,
                is_default
            ) values (
                :user_id,
                :owner_username,
                :blog_type,
                :blog_url,
                :username,
                :password_value,
                :api_url,
                :blog_name,
                :is_default
            )
            returning config_id into :new_id
            """,
            {
                "user_id": owner_id,
                "owner_username": owner_username,
                "blog_type": payload.blog_type,
                "blog_url": payload.blog_url,
                "username": payload.username,
                "password_value": payload.password,
                "api_url": payload.api_url,
                "blog_name": payload.blog_name,
                "is_default": 1 if should_be_default else 0,
                "new_id": new_id,
            },
        )
        await connection.commit()
        config_id = int(new_id.getvalue()[0])
    created = await get_blog_publish_config(config_id, auth_context)
    if created is None:
        raise RuntimeError("Blog publish config was inserted but could not be reloaded")
    return created


async def update_blog_publish_config(
    config_id: int,
    payload: BlogPublishConfigUpdate,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        current = await _get_blog_publish_config_with_password(cursor, config_id, auth_context)
        if current is None:
            return None

        values = payload.model_dump(exclude_unset=True)
        should_be_default = bool(values.pop("is_default")) if "is_default" in values else current["is_default"]
        password_value = values.pop("password", None)
        if password_value is not None:
            values["password_value"] = password_value
        values["updated_at"] = None

        if should_be_default:
            await _clear_owner_default(cursor, current["owner_username"])

        assignments: list[str] = []
        params: dict[str, Any] = {"config_id": config_id}
        for key, value in values.items():
            if key == "updated_at":
                assignments.append("updated_at = systimestamp")
                continue
            assignments.append(f"{key} = :{key}")
            params[key] = value
        assignments.append("is_default = :is_default")
        params["is_default"] = 1 if should_be_default else 0

        owner_match, owner_params = _owner_params(current["owner_username"])
        params.update(owner_params)
        await cursor.execute(
            f"""
            update tk_blog_publish_configs
            set {", ".join(assignments)}
            where config_id = :config_id
              and {owner_match}
            """,
            params,
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return None
        await _ensure_owner_has_default(cursor, current["owner_username"], preferred_config_id=config_id)
        await connection.commit()

    return await get_blog_publish_config(config_id, auth_context)


async def delete_blog_publish_config(config_id: int, auth_context: AuthContext) -> bool:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        current = await _get_blog_publish_config_with_password(cursor, config_id, auth_context)
        if current is None:
            return False
        owner_match, owner_params = _owner_params(current["owner_username"])
        await cursor.execute(
            f"""
            delete from tk_blog_publish_configs
            where config_id = :config_id
              and {owner_match}
            """,
            {"config_id": config_id, **owner_params},
        )
        if cursor.rowcount == 0:
            await connection.rollback()
            return False
        await _ensure_owner_has_default(cursor, current["owner_username"], preferred_config_id=None)
        await connection.commit()
    return True


async def get_blog_publish_config(config_id: int, auth_context: AuthContext) -> dict[str, Any] | None:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        owner_clause, params = _owner_clause(auth_context)
        await cursor.execute(
            f"""
            select {CONFIG_COLUMNS}
            from tk_blog_publish_configs
            where config_id = :config_id
              and {owner_clause}
            """,
            {"config_id": config_id, **params},
        )
        row = await cursor.fetchone()
    return _row_to_config(row) if row else None


async def validate_blog_publish_config(
    *,
    blog_url: str,
    username: str,
    password: str,
    api_url: str,
    blog_name: str | None,
    blog_id: str | None = None,
) -> dict[str, Any]:
    result = await validate_metaweblog_config(
        api_url=api_url,
        username=username,
        password=password,
        blog_url=blog_url,
        blog_name=blog_name,
        blog_id=blog_id,
    )
    resolved_name = result.blog_name or blog_name or "未命名博客"
    return {
        "blog_id": result.blog_id,
        "blog_name": result.blog_name,
        "blog_url": result.blog_url,
        "message": f"验证成功，已连接到 {resolved_name}。",
    }


async def list_blog_publish_categories(config_id: int, auth_context: AuthContext) -> list[dict[str, Any]]:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        config = await _get_blog_publish_config_with_password(cursor, config_id, auth_context)
        if config is None:
            raise BlogPublishConfigNotFoundError

        resolved_blog, categories = await list_metaweblog_categories(
            api_url=config["api_url"],
            username=config["username"],
            password=config["password_value"],
            blog_url=config["blog_url"],
            blog_name=config["blog_name"],
            blog_id=config["blog_id"],
        )
        await cursor.execute(
            """
            update tk_blog_publish_configs
            set blog_name = :blog_name,
                blog_id = :blog_id,
                updated_at = systimestamp
            where config_id = :config_id
            """,
            {
                "config_id": config["id"],
                "blog_name": resolved_blog.blog_name,
                "blog_id": resolved_blog.blog_id,
            },
        )
        await connection.commit()
    return [
        {
            "category_id": item.category_id,
            "title": item.title,
            "description": item.description,
        }
        for item in categories
    ]


async def publish_blog_factory_article(
    item_id: int,
    payload: BlogFactoryPublishRequest,
    auth_context: AuthContext,
) -> dict[str, Any]:
    async with acquire_connection() as connection:
        await _ensure_blog_publish_table(connection)
        cursor = connection.cursor()
        config = await _resolve_publish_config(cursor, payload.config_id, auth_context)
        if config is None:
            raise BlogPublishConfigNotFoundError

        item_owner_match, item_owner_params = _item_owner_params(config["user_id"])
        await cursor.execute(
            f"""
            select knowledge_id, user_id, topic_tag_snapshot, remote_post_id, nvl(factory_status, '待处理')
            from ai_blog_factory
            where id = :item_id
              and {item_owner_match}
            for update
            """,
            {"item_id": item_id, **item_owner_params},
        )
        row = await cursor.fetchone()
        if row is None:
            raise BlogFactoryPublishTargetNotFoundError

        knowledge_id = row[0]
        item_user_id = row[1]
        topic_tag_snapshot = row[2]
        remote_post_id = row[3]
        current_factory_status = row[4]
        title = _resolve_article_title(payload.article_title, payload.article_markdown)
        if not title:
            raise ValueError("Markdown 正文缺少一级标题，请先补充文章标题。")
        categories = payload.categories
        tags = payload.tags or _split_tags(topic_tag_snapshot)
        publish_markdown = _strip_leading_markdown_title(payload.article_markdown)
        local_media = await _collect_local_publish_media(cursor, publish_markdown)

        publish_result = await publish_metaweblog_post(
            api_url=config["api_url"],
            username=config["username"],
            password=config["password_value"],
            title=title,
            markdown=publish_markdown,
            categories=categories,
            tags=tags,
            submission_option=payload.submission_option,
            publish=payload.publish,
            post_id=remote_post_id,
            blog_url=config["blog_url"],
            blog_name=config["blog_name"],
            blog_id=config["blog_id"],
            local_media=local_media,
        )

        await cursor.execute(
            """
            update tk_blog_publish_configs
            set blog_name = :blog_name,
                blog_id = :blog_id,
                updated_at = systimestamp
            where config_id = :config_id
            """,
            {
                "config_id": config["id"],
                "blog_name": publish_result.blog_name,
                "blog_id": publish_result.blog_id,
            },
        )
        await _update_factory_publish_metadata(
            cursor,
            item_id=item_id,
            config_id=config["id"],
            post_id=publish_result.post_id,
            publish=payload.publish,
            submission_option=payload.submission_option,
            categories=categories,
            tags=tags,
            current_factory_status=current_factory_status,
        )
        if payload.publish:
            await _mark_factory_item_published(cursor, knowledge_id, item_user_id)
        await connection.commit()

    item = await get_blog_factory_item(item_id, auth_context)
    if item is None:
        raise BlogFactoryPublishTargetNotFoundError
    return {
        "item": item,
        "config_id": config["id"],
        "post_id": publish_result.post_id,
        "blog_name": publish_result.blog_name,
        "blog_url": publish_result.blog_url,
        "published": payload.publish,
    }


async def _mark_factory_item_published(cursor: Any, knowledge_id: int, user_id: int | None) -> None:
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
        set blog_status_snapshot = '已发布',
            factory_status = '已发布'
        where knowledge_id = :knowledge_id
          and ((user_id = :user_id) or (user_id is null and :user_id is null))
        """,
        {"knowledge_id": knowledge_id, "user_id": user_id},
    )


async def _resolve_publish_config(
    cursor: Any,
    config_id: int | None,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    if config_id is not None:
        return await _get_blog_publish_config_with_password(cursor, config_id, auth_context)

    owner_clause, params = _owner_clause(auth_context)
    await cursor.execute(
        f"""
        select config_id, user_id, owner_username, blog_type, blog_url, username, password_value, api_url, blog_name, blog_id, is_default
        from tk_blog_publish_configs
        where {owner_clause}
        order by is_default desc, updated_at desc nulls last, config_id desc
        fetch first 1 rows only
        """,
        params,
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "owner_username": row[2],
        "blog_type": row[3],
        "blog_url": row[4],
        "username": row[5],
        "password_value": row[6],
        "api_url": row[7],
        "blog_name": row[8],
        "blog_id": row[9],
        "is_default": bool(row[10]),
    }


async def _get_blog_publish_config_with_password(
    cursor: Any,
    config_id: int,
    auth_context: AuthContext,
) -> dict[str, Any] | None:
    owner_clause, params = _owner_clause(auth_context)
    await cursor.execute(
        f"""
        select config_id, user_id, owner_username, blog_type, blog_url, username, password_value, api_url, blog_name, blog_id, is_default
        from tk_blog_publish_configs
        where config_id = :config_id
          and {owner_clause}
        """,
        {"config_id": config_id, **params},
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "owner_username": row[2],
        "blog_type": row[3],
        "blog_url": row[4],
        "username": row[5],
        "password_value": row[6],
        "api_url": row[7],
        "blog_name": row[8],
        "blog_id": row[9],
        "is_default": bool(row[10]),
    }


def _owner_clause(auth_context: AuthContext) -> tuple[str, dict[str, Any]]:
    owner_username = _normalize_owner_username(auth_context.username)
    if auth_context.is_admin or auth_context.user_id is None:
        return _owner_params(owner_username)
    return (
        "(user_id = :owner_user_id or (user_id is null and lower(owner_username) = lower(:owner_username)))",
        {"owner_user_id": auth_context.user_id, "owner_username": owner_username},
    )


def _owner_params(
    owner_username: str,
    *,
    column_name: str = "owner_username",
    param_name: str = "owner_username",
) -> tuple[str, dict[str, Any]]:
    return f"lower({column_name}) = lower(:{param_name})", {param_name: owner_username}


async def _owner_has_configs(cursor: Any, owner_username: str) -> bool:
    owner_match, params = _owner_params(owner_username)
    await cursor.execute(
        f"select count(*) from tk_blog_publish_configs where {owner_match}",
        params,
    )
    row = await cursor.fetchone()
    return bool(row and int(row[0]) > 0)


async def _clear_owner_default(cursor: Any, owner_username: str) -> None:
    owner_match, params = _owner_params(owner_username)
    await cursor.execute(
        f"""
        update tk_blog_publish_configs
        set is_default = 0
        where {owner_match}
        """,
        params,
    )


async def _ensure_owner_has_default(cursor: Any, owner_username: str, preferred_config_id: int | None) -> None:
    owner_match, params = _owner_params(owner_username)
    await cursor.execute(
        f"""
        select config_id
        from tk_blog_publish_configs
        where {owner_match}
          and is_default = 1
        fetch first 1 rows only
        """,
        params,
    )
    if await cursor.fetchone():
        return

    if preferred_config_id is not None:
        await cursor.execute(
            f"""
            update tk_blog_publish_configs
            set is_default = 1
            where config_id = :config_id
              and {owner_match}
            """,
            {"config_id": preferred_config_id, **params},
        )
        if cursor.rowcount > 0:
            return

    await cursor.execute(
        f"""
        update tk_blog_publish_configs
        set is_default = 1
        where config_id = (
            select config_id
            from (
                select config_id
                from tk_blog_publish_configs
                where {owner_match}
                order by updated_at desc nulls last, config_id desc
            )
            where rownum = 1
        )
        """,
        params,
    )


async def _ensure_blog_publish_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    logger.info("Ensuring Oracle table tk_blog_publish_configs exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create table tk_blog_publish_configs (
                    config_id number generated always as identity primary key,
                    user_id number,
                    owner_username varchar2(100),
                    blog_type varchar2(50) default ''METAWEBLOG_API'' not null,
                    blog_url varchar2(500) not null,
                    username varchar2(100) not null,
                    password_value varchar2(500) not null,
                    api_url varchar2(500) not null,
                    blog_name varchar2(200),
                    blog_id varchar2(200),
                    is_default number(1) default 0 not null,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp default systimestamp not null,
                    constraint tk_blog_publish_cfg_user_fk foreign key (user_id) references tk_users(user_id),
                    constraint tk_blog_publish_cfg_type_ck check (blog_type in (''METAWEBLOG_API'')),
                    constraint tk_blog_publish_cfg_default_ck check (is_default in (0, 1))
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


async def _update_factory_publish_metadata(
    cursor: Any,
    *,
    item_id: int,
    config_id: int,
    post_id: str,
    publish: bool,
    submission_option: str,
    categories: list[str],
    tags: list[str],
    current_factory_status: str,
) -> None:
    factory_status = "已发布" if publish else ("已发布" if current_factory_status == "已发布" else "已处理")
    remote_published_at_sql = "systimestamp" if publish else "remote_published_at"
    await cursor.execute(
        f"""
        update ai_blog_factory
        set remote_post_id = :post_id,
            remote_publish_config_id = :config_id,
            remote_publish_state = :publish_state,
            remote_submission_option = :submission_option,
            remote_categories_snapshot = :categories_snapshot,
            remote_tags_snapshot = :tags_snapshot,
            remote_last_synced_at = systimestamp,
            remote_published_at = {remote_published_at_sql},
            factory_status = :factory_status
        where id = :item_id
        """,
        {
            "item_id": item_id,
            "config_id": config_id,
            "post_id": post_id,
            "publish_state": "published" if publish else "draft",
            "submission_option": submission_option,
            "categories_snapshot": _join_tags(categories),
            "tags_snapshot": _join_tags(tags),
            "factory_status": factory_status,
        },
    )
    await _add_column_if_missing(cursor, "owner_username varchar2(100)")
    logger.info("Ensuring Oracle index tk_blog_publish_cfg_owner_idx exists")
    await cursor.execute(
        """
        update tk_blog_publish_configs config
        set owner_username = (
            select users.username
            from tk_users users
            where users.user_id = config.user_id
        )
        where owner_username is null
          and user_id is not null
        """
    )
    await cursor.execute(
        """
        update tk_blog_publish_configs config
        set user_id = (
            select users.user_id
            from tk_users users
            where lower(users.username) = lower(config.owner_username)
            fetch next 1 rows only
        )
        where user_id is null
          and owner_username is not null
          and exists (
              select 1
              from tk_users users
              where lower(users.username) = lower(config.owner_username)
          )
        """
    )
    await cursor.execute(
        """
        update tk_blog_publish_configs
        set owner_username = :owner_username
        where owner_username is null
        """,
        {"owner_username": settings.admin_username},
    )
    await cursor.execute(
        """
        begin
            execute immediate '
                create index tk_blog_publish_cfg_owner_idx
                on tk_blog_publish_configs (owner_username, is_default, updated_at)
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


async def _add_column_if_missing(cursor: Any, column_definition: str) -> None:
    ddl = column_definition.replace("'", "''")
    logger.info("Ensuring Oracle column tk_blog_publish_configs.%s exists", column_definition.split()[0])
    await cursor.execute(
        f"""
        begin
            execute immediate '
                alter table tk_blog_publish_configs
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


def _resolve_article_title(article_title: str | None, markdown: str) -> str:
    if article_title and article_title.strip():
        return article_title.strip()[:300]
    for line in markdown.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line.strip())
        if match:
            return match.group(1).strip()[:300]
    return ""


def _strip_leading_markdown_title(markdown: str) -> str:
    lines = markdown.replace("\r\n", "\n").split("\n")
    first_content_index: int | None = None
    for index, line in enumerate(lines):
        if line.strip():
            first_content_index = index
            break
    if first_content_index is None:
        return markdown.strip()

    if not re.match(r"^#\s+.+$", lines[first_content_index].strip()):
        return markdown.strip()

    next_index = first_content_index + 1
    while next_index < len(lines) and not lines[next_index].strip():
        next_index += 1
    return "\n".join(lines[next_index:]).strip()


def _split_tags(value: str | None) -> list[str]:
    if not value:
        return []
    return [tag[:100] for tag in re.split(r"[,，\n]+", value) if tag.strip()]


def _join_tags(values: list[str]) -> str | None:
    compact = [value.strip()[:100] for value in values if value.strip()]
    return ",".join(compact) if compact else None


async def _collect_local_publish_media(cursor: Any, markdown: str) -> list[MetaWeblogLocalMedia]:
    sources = _extract_local_media_sources(markdown)
    if not sources:
        return []

    media_items: list[MetaWeblogLocalMedia] = []
    for source_url, public_id in sources:
        content = await get_media_content_for_cursor(cursor, public_id)
        if content is None:
            raise ValueError(f"待发布正文中的图片不存在或已删除：{source_url}")

        path, content_type = content
        media_items.append(
            MetaWeblogLocalMedia(
                source_url=source_url,
                name=path.name,
                content_type=content_type,
                data=path.read_bytes(),
            )
        )
    return media_items


def _extract_local_media_sources(markdown: str) -> list[tuple[str, str]]:
    sources: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in re.finditer(r"!\[[^\]]*]\(([^)\s]+)(?:\s+['\"][^'\"]*['\"])?\)", markdown):
        source_url = match.group(1).strip()
        public_id = _extract_media_public_id(source_url)
        if not public_id or source_url in seen:
            continue
        seen.add(source_url)
        sources.append((source_url, public_id))
    return sources


def _extract_media_public_id(source_url: str) -> str | None:
    parsed = urlparse(source_url)
    path = parsed.path if parsed.scheme or parsed.netloc else source_url.split("?", 1)[0].split("#", 1)[0]
    normalized_path = unquote(path).strip()
    match = re.match(r"^/?api/media/([^/]+)/content/?$", normalized_path)
    return match.group(1) if match else None


def _item_owner_params(owner_id: int | None) -> tuple[str, dict[str, Any]]:
    if owner_id is None:
        return "ai_blog_factory.user_id is null", {}
    return "ai_blog_factory.user_id = :item_owner_user_id", {"item_owner_user_id": owner_id}


def _normalize_owner_username(value: str) -> str:
    return value.strip()
