"""File-backed Agent capability registry for Skill scoping.

The registry deliberately lives beside the existing file-backed Skill registry.  It
does not change authentication or Oracle business data, and keeps personal Skill
attachments isolated by username.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.repositories.users import AuthContext


AGENTS_FILE = ".trusted-agents.json"
DEFAULT_AGENTS = [
    ("knowledge-processing", "知识加工", "知识加工"),
    ("history-ask", "历史问数", "历史问数"),
    ("todo-ask", "待办问数", "待办问数"),
    ("knowledge-ask", "知识问数", "知识问数"),
    ("english-ask", "英语问数", "英语问数"),
    ("blog-review", "博客审阅", "博客审阅"),
    ("english-generation", "英语生成", "英语素材生成"),
    ("english-extraction", "英语提炼", "英语素材补全"),
    ("skill-generation", "Skill 创建", "自定义 Skill 创建"),
    ("blog-enhancement", "博客增强", "博客工厂内容增强"),
]


class AgentPermissionError(Exception):
    pass


class AgentValidationError(Exception):
    pass


def _path() -> Path:
    root = settings.skill_storage_path
    root.mkdir(parents=True, exist_ok=True)
    return root / AGENTS_FILE


def _initial() -> dict[str, Any]:
    return {"agents": [{"code": code, "name": name, "module_label": label, "enabled": True, "allow_personal_skills": code not in {"history-ask", "todo-ask", "knowledge-ask", "english-ask"}, "system_skill_ids": [], "default_skill_ids": []} for code, name, label in DEFAULT_AGENTS], "personal_bindings": {}}


def _read() -> dict[str, Any]:
    path = _path()
    if not path.exists():
        data = _initial()
        _write(data)
        return data
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        data = _initial()
    data.setdefault("agents", _initial()["agents"])
    data.setdefault("personal_bindings", {})
    existing = {item.get("code") for item in data["agents"]}
    for item in _initial()["agents"]:
        if item["code"] not in existing:
            data["agents"].append(item)
    return data


def _write(data: dict[str, Any]) -> None:
    _path().write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _agent(data: dict[str, Any], code: str) -> dict[str, Any]:
    for item in data["agents"]:
        if item.get("code") == code:
            return item
    raise AgentValidationError("未找到对应 Agent")


def list_agents(auth: AuthContext) -> list[dict[str, Any]]:
    data = _read()
    username = auth.username.strip().lower()
    result = []
    for item in data["agents"]:
        if not item.get("enabled", True):
            continue
        binding = data["personal_bindings"].get(username, {}).get(item["code"], [])
        if isinstance(binding, list):
            binding = {"skill_ids": binding, "default_skill_ids": []}
        result.append({**item, "personal_skill_ids": binding.get("skill_ids", []), "personal_default_skill_ids": binding.get("default_skill_ids", []), "can_manage": auth.is_admin})
    return result


def allowed_skill_ids(agent_code: str, auth: AuthContext) -> tuple[set[str] | None, list[str]]:
    data = _read()
    item = _agent(data, agent_code)
    if not item.get("enabled", True):
        return set(), []
    system_ids = list(dict.fromkeys(item.get("system_skill_ids", [])))
    personal = []
    if item.get("allow_personal_skills", False):
        binding = data["personal_bindings"].get(auth.username.strip().lower(), {}).get(agent_code, [])
        if isinstance(binding, list):
            binding = {"skill_ids": binding, "default_skill_ids": []}
        personal = binding.get("skill_ids", [])
    allowed = set(system_ids) | set(personal)
    # An Agent is deliberately opt-in during migration.  Until it has at least
    # one configured relation, callers retain the pre-Agent Skill behaviour.
    if not allowed:
        return None, []
    personal_defaults = [skill_id for skill_id in binding.get("default_skill_ids", []) if skill_id in personal] if item.get("allow_personal_skills", False) else []
    defaults = personal_defaults or [skill_id for skill_id in item.get("default_skill_ids", []) if skill_id in allowed]
    return allowed, defaults


def update_agent(agent_code: str, *, system_skill_ids: list[str], default_skill_ids: list[str], allow_personal_skills: bool, auth: AuthContext) -> dict[str, Any]:
    if not auth.is_admin:
        raise AgentPermissionError("只有超级管理员可以配置 Agent")
    data = _read()
    item = _agent(data, agent_code)
    unique_ids = list(dict.fromkeys(system_skill_ids))[:8]
    from app.repositories.skills import SkillNotFoundError, _read_metadata, _skill_dir
    for skill_id in unique_ids:
        try:
            metadata = _read_metadata(_skill_dir(skill_id))
        except SkillNotFoundError as exc:
            raise AgentValidationError("系统关联中包含不存在的 Skill") from exc
        if not metadata.get("enabled", True):
            raise AgentValidationError("系统关联只能使用已启用的 Skill")
    if not set(default_skill_ids).issubset(unique_ids):
        raise AgentValidationError("默认 Skill 必须属于该 Agent 的可用 Skill")
    item["system_skill_ids"] = unique_ids
    item["default_skill_ids"] = list(dict.fromkeys(default_skill_ids))[:8]
    item["allow_personal_skills"] = allow_personal_skills
    _write(data)
    return item


def update_personal_binding(agent_code: str, skill_ids: list[str], default_skill_ids: list[str], auth: AuthContext) -> dict[str, list[str]]:
    data = _read()
    item = _agent(data, agent_code)
    if not item.get("allow_personal_skills", False):
        raise AgentPermissionError("该 Agent 不允许挂载个人 Skill")
    from app.repositories.skills import SkillNotFoundError, _is_owner, _read_metadata, _skill_dir
    unique_ids = list(dict.fromkeys(skill_ids))[:8]
    for skill_id in unique_ids:
        try:
            metadata = _read_metadata(_skill_dir(skill_id))
        except SkillNotFoundError as exc:
            raise AgentValidationError("个人挂载中包含不存在的 Skill") from exc
        if not metadata.get("enabled", True) or not _is_owner(metadata, auth):
            raise AgentPermissionError("个人挂载只能使用自己启用的 Skill")
    if not set(default_skill_ids).issubset(unique_ids):
        raise AgentValidationError("个人默认 Skill 必须属于自己的挂载")
    username = auth.username.strip().lower()
    data["personal_bindings"].setdefault(username, {})[agent_code] = {"skill_ids": unique_ids, "default_skill_ids": list(dict.fromkeys(default_skill_ids))[:8]}
    _write(data)
    return data["personal_bindings"][username][agent_code]
