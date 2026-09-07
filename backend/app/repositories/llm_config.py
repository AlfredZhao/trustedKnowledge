from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any

import oracledb
from dotenv import dotenv_values

from app.core.config import settings


HISTORY_ASK_MODULE_KEY = "history_ask"
MODEL_SELECTOR_PREFIX = "llm-config:"
DEFAULT_API_KEY_ENV_VAR = "TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY"
_ENV_VAR_PATTERN = re.compile(r"^TRUSTED_KNOWLEDGE_LLM_[A-Z0-9_]+_API_KEY$|^TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY$")
_table_ready = False
logger = logging.getLogger(__name__)


def make_model_selector(model_config_id: int) -> str:
    return f"{MODEL_SELECTOR_PREFIX}{model_config_id}"


def parse_model_selector(value: str | None) -> int | None:
    raw = (value or "").strip()
    if not raw.startswith(MODEL_SELECTOR_PREFIX):
        return None
    try:
        model_config_id = int(raw.removeprefix(MODEL_SELECTOR_PREFIX))
    except ValueError:
        return None
    return model_config_id if model_config_id > 0 else None


async def ensure_llm_config_table(connection: oracledb.AsyncConnection) -> None:
    """Create the multi-model store and safely import the previous singleton config."""
    global _table_ready
    if _table_ready:
        return
    cursor = connection.cursor()
    logger.info("Ensuring Oracle table ai_llm_model_configs exists")
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_llm_model_configs (
                    id number generated always as identity primary key,
                    legacy_module_key varchar2(64),
                    display_name varchar2(160),
                    provider_name varchar2(100) default ''OpenAI Compatible'' not null,
                    base_url varchar2(1000) not null,
                    model_name varchar2(200) not null,
                    api_key_env_var varchar2(160) not null,
                    enabled number(1) default 1 not null,
                    sort_order number(8) default 0 not null,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp default systimestamp not null
                )
            ';
        exception when others then
            if sqlcode != -955 then raise; end if;
        end;
        """
    )
    # The legacy table is read-only. MERGE makes repeated startup safe.
    await cursor.execute(
        """
        begin
            merge into ai_llm_model_configs target
            using (
                select module_key, provider_name, base_url, model_name, enabled
                from ai_llm_configs where module_key = :module_key
            ) source
            on (target.legacy_module_key = source.module_key)
            when not matched then insert (
                legacy_module_key, display_name, provider_name, base_url, model_name,
                api_key_env_var, enabled, sort_order
            ) values (
                source.module_key, nvl(source.provider_name, 'OpenAI Compatible') || ' · ' || nvl(source.model_name, '未命名模型'),
                nvl(source.provider_name, 'OpenAI Compatible'), nvl(source.base_url, ''), nvl(source.model_name, ''),
                :api_key_env_var, source.enabled, 0
            );
        exception when others then
            if sqlcode != -942 then raise; end if;
        end;
        """,
        {"module_key": HISTORY_ASK_MODULE_KEY, "api_key_env_var": DEFAULT_API_KEY_ENV_VAR},
    )
    _table_ready = True


def _api_key_for(config: dict[str, Any]) -> str:
    env_var = str(config.get("api_key_env_var") or DEFAULT_API_KEY_ENV_VAR)
    if not _ENV_VAR_PATTERN.fullmatch(env_var):
        return ""
    # Pydantic reads known settings from backend/.env but intentionally does not
    # inject arbitrary custom-model keys into os.environ.  Consult that same file
    # for allow-listed key names, while preserving real environment precedence.
    value = os.getenv(env_var)
    if value is None:
        value = dotenv_values(Path(__file__).resolve().parents[2] / ".env").get(env_var)
    return value.strip() if isinstance(value, str) else ""


def get_llm_api_key(config: dict[str, Any]) -> str:
    return _api_key_for(config)


def _to_config(row: Any) -> dict[str, Any]:
    config = {"id": int(row[0]), "display_name": row[1] or "", "provider_name": row[2] or "OpenAI Compatible", "base_url": row[3] or "", "model_name": row[4] or "", "api_key_env_var": row[5] or DEFAULT_API_KEY_ENV_VAR, "enabled": row[6] == 1, "sort_order": int(row[7] or 0)}
    config["has_api_key"] = bool(_api_key_for(config))
    return config


async def list_llm_model_configs(connection: oracledb.AsyncConnection) -> list[dict[str, Any]]:
    await ensure_llm_config_table(connection)
    cursor = connection.cursor()
    await cursor.execute("select id, display_name, provider_name, base_url, model_name, api_key_env_var, enabled, sort_order from ai_llm_model_configs order by sort_order, id")
    return [_to_config(row) for row in await cursor.fetchall()]


async def get_llm_model_config(connection: oracledb.AsyncConnection, model_config_id: int, *, require_enabled: bool = False) -> dict[str, Any]:
    await ensure_llm_config_table(connection)
    cursor = connection.cursor()
    await cursor.execute("select id, display_name, provider_name, base_url, model_name, api_key_env_var, enabled, sort_order from ai_llm_model_configs where id = :id", {"id": model_config_id})
    row = await cursor.fetchone()
    if not row:
        raise RuntimeError("所选模型配置不存在或已被删除。")
    config = _to_config(row)
    if require_enabled and not config["enabled"]:
        raise RuntimeError("所选模型未启用，请在模型配置中启用后重试。")
    return config


async def get_history_ask_llm_config(connection: oracledb.AsyncConnection, selector: str | None = None) -> dict[str, Any]:
    selected_id = parse_model_selector(selector)
    if selected_id is not None:
        return await get_llm_model_config(connection, selected_id, require_enabled=True)
    configs = await list_llm_model_configs(connection)
    enabled = next((item for item in configs if item["enabled"] and item["base_url"] and item["model_name"]), None)
    if enabled:
        return enabled
    return {"id": None, "display_name": "", "provider_name": "OpenAI Compatible", "base_url": "", "model_name": "", "api_key_env_var": DEFAULT_API_KEY_ENV_VAR, "enabled": False, "sort_order": 0, "has_api_key": bool(settings.history_ask_llm_api_key.strip())}


async def create_llm_model_config(connection: oracledb.AsyncConnection, payload: dict[str, Any]) -> dict[str, Any]:
    await ensure_llm_config_table(connection)
    values = _normalized_payload(payload)
    cursor = connection.cursor()
    id_var = cursor.var(oracledb.NUMBER)
    await cursor.execute("insert into ai_llm_model_configs (display_name, provider_name, base_url, model_name, api_key_env_var, enabled, sort_order) values (:display_name, :provider_name, :base_url, :model_name, :api_key_env_var, :enabled, :sort_order) returning id into :id", {**values, "id": id_var})
    await connection.commit()
    return await get_llm_model_config(connection, int(id_var.getvalue()[0]))


async def update_llm_model_config(connection: oracledb.AsyncConnection, model_config_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    await get_llm_model_config(connection, model_config_id)
    values = _normalized_payload(payload)
    cursor = connection.cursor()
    await cursor.execute("update ai_llm_model_configs set display_name = :display_name, provider_name = :provider_name, base_url = :base_url, model_name = :model_name, api_key_env_var = :api_key_env_var, enabled = :enabled, sort_order = :sort_order, updated_at = systimestamp where id = :id", {**values, "id": model_config_id})
    await connection.commit()
    return await get_llm_model_config(connection, model_config_id)


async def delete_llm_model_config(connection: oracledb.AsyncConnection, model_config_id: int) -> None:
    await get_llm_model_config(connection, model_config_id)
    cursor = connection.cursor()
    await cursor.execute("delete from ai_llm_model_configs where id = :id", {"id": model_config_id})
    await connection.commit()


def _normalized_payload(payload: dict[str, Any]) -> dict[str, Any]:
    provider_name = str(payload.get("provider_name") or "").strip() or "OpenAI Compatible"
    model_name = str(payload.get("model_name") or "").strip()
    api_key_env_var = str(payload.get("api_key_env_var") or DEFAULT_API_KEY_ENV_VAR).strip()
    if not _ENV_VAR_PATTERN.fullmatch(api_key_env_var):
        raise ValueError("API Key 环境变量仅允许 TRUSTED_KNOWLEDGE_LLM_<名称>_API_KEY 格式。")
    return {"display_name": str(payload.get("display_name") or "").strip() or f"{provider_name} · {model_name}", "provider_name": provider_name, "base_url": str(payload.get("base_url") or "").strip(), "model_name": model_name, "api_key_env_var": api_key_env_var, "enabled": 1 if payload.get("enabled") else 0, "sort_order": int(payload.get("sort_order") or 0)}
