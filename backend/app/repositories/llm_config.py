from typing import Any

import logging
import oracledb

from app.core.config import settings


HISTORY_ASK_MODULE_KEY = "history_ask"

_table_ready = False
logger = logging.getLogger(__name__)


async def ensure_llm_config_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return

    cursor = connection.cursor()
    logger.info("Ensuring Oracle table ai_llm_configs exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_llm_configs (
                    id number generated always as identity primary key,
                    module_key varchar2(64) not null,
                    provider_name varchar2(100) default ''OpenAI Compatible'' not null,
                    base_url varchar2(1000),
                    model_name varchar2(200),
                    enabled number(1) default 0 not null,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp default systimestamp not null,
                    constraint ai_llm_configs_module_uk unique (module_key),
                    constraint ai_llm_configs_enabled_ck check (enabled in (0, 1))
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
    await _drop_api_key_column_if_present(cursor)
    _table_ready = True


async def _drop_api_key_column_if_present(cursor: Any) -> None:
    logger.info("Ensuring Oracle column ai_llm_configs.api_key is absent")
    await cursor.execute(
        """
        begin
            execute immediate '
                alter table ai_llm_configs drop column api_key
            ';
        exception
            when others then
                if sqlcode != -904 then
                    raise;
                end if;
        end;
        """
    )


def _default_config() -> dict[str, Any]:
    return {
        "provider_name": "OpenAI Compatible",
        "base_url": "",
        "model_name": "",
        "enabled": False,
        "has_api_key": bool(settings.history_ask_llm_api_key.strip()),
    }


async def get_history_ask_llm_config(connection: oracledb.AsyncConnection) -> dict[str, Any]:
    await ensure_llm_config_table(connection)
    cursor = connection.cursor()
    await cursor.execute(
        """
        select provider_name, base_url, model_name, enabled
        from ai_llm_configs
        where module_key = :module_key
        """,
        {"module_key": HISTORY_ASK_MODULE_KEY},
    )
    row = await cursor.fetchone()
    if not row:
        return _default_config()

    return {
        "provider_name": row[0] or "OpenAI Compatible",
        "base_url": row[1] or "",
        "model_name": row[2] or "",
        "enabled": row[3] == 1,
        "has_api_key": bool(settings.history_ask_llm_api_key.strip()),
    }


async def update_history_ask_llm_config(connection: oracledb.AsyncConnection, payload: dict[str, Any]) -> dict[str, Any]:
    await ensure_llm_config_table(connection)
    cursor = connection.cursor()

    provider_name = (payload.get("provider_name") or "").strip() or "OpenAI Compatible"
    base_url = (payload.get("base_url") or "").strip()
    model_name = (payload.get("model_name") or "").strip()
    enabled = 1 if payload.get("enabled") else 0

    await cursor.execute(
        """
        merge into ai_llm_configs target
        using (
            select
                :module_key as module_key,
                :provider_name as provider_name,
                :base_url as base_url,
                :model_name as model_name,
                :enabled as enabled
            from dual
        ) source
        on (target.module_key = source.module_key)
        when matched then update set
            target.provider_name = source.provider_name,
            target.base_url = source.base_url,
            target.model_name = source.model_name,
            target.enabled = source.enabled,
            target.updated_at = systimestamp
        when not matched then insert (
            module_key,
            provider_name,
            base_url,
            model_name,
            enabled
        ) values (
            source.module_key,
            source.provider_name,
            source.base_url,
            source.model_name,
            source.enabled
        )
        """,
        {
            "module_key": HISTORY_ASK_MODULE_KEY,
            "provider_name": provider_name,
            "base_url": base_url,
            "model_name": model_name,
            "enabled": enabled,
        },
    )
    await connection.commit()
    return await get_history_ask_llm_config(connection)
