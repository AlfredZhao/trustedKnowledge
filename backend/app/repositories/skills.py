import json
import re
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from zipfile import BadZipFile, ZipFile

from app.core.config import settings
from app.repositories.users import AuthContext
from app.schemas.skills import SkillCreate, SkillUpdate


METADATA_FILE = ".trusted-skill.json"
SKILL_MARKDOWN = "SKILL.md"
MAX_FILE_SIZE = 300_000
TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".sql",
}
LIST_SCOPES = {"owned", "callable", "shared"}


class SkillNotFoundError(Exception):
    pass


class SkillValidationError(Exception):
    pass


class SkillPermissionError(Exception):
    pass


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _storage_root() -> Path:
    root = settings.skill_storage_path
    root.mkdir(parents=True, exist_ok=True)
    return root


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip().lower()).strip("-")
    return normalized[:48] or "skill"


def _new_skill_id(name: str) -> str:
    return f"{_slugify(name)}-{uuid.uuid4().hex[:8]}"


def _skill_dir(skill_id: str) -> Path:
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,80}", skill_id):
        raise SkillNotFoundError("Skill not found")
    path = _storage_root() / skill_id
    if not path.exists() or not path.is_dir():
        raise SkillNotFoundError("Skill not found")
    return path


def _metadata_path(skill_dir: Path) -> Path:
    return skill_dir / METADATA_FILE


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _is_text_previewable(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES and path.stat().st_size <= MAX_FILE_SIZE


def _read_text_file(path: Path) -> str:
    if not path.exists() or not path.is_file():
        return ""
    if not _is_text_previewable(path):
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return ""


def _list_files(skill_dir: Path, *, can_edit: bool) -> list[dict[str, Any]]:
    files = []
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file() or path.name == METADATA_FILE:
            continue
        readable = _is_text_previewable(path)
        files.append(
            {
                "path": path.relative_to(skill_dir).as_posix(),
                "size": path.stat().st_size,
                "readable": readable,
                "editable": readable and can_edit,
            }
        )
    return files


def _find_skill_markdown(skill_dir: Path) -> Path | None:
    direct = skill_dir / SKILL_MARKDOWN
    if direct.exists():
        return direct
    matches = [path for path in skill_dir.rglob(SKILL_MARKDOWN) if path.is_file()]
    return sorted(matches, key=lambda item: len(item.relative_to(skill_dir).parts))[0] if matches else None


def _extract_skill_markdown_summary(content: str) -> tuple[str | None, str]:
    name = None
    description_lines = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            if description_lines:
                break
            continue
        if line.startswith("#") and not name:
            name = line.lstrip("#").strip()[:120]
            continue
        if line.lower().startswith("description:"):
            description_lines.append(line.split(":", 1)[1].strip())
            continue
        if not line.startswith("#"):
            description_lines.append(line)
        if len(" ".join(description_lines)) > 800:
            break
    return name, " ".join(description_lines).strip()[:2000]


def _normalize_skill_type(value: Any, *, default_legacy: bool) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"system", "user"}:
        return normalized
    return "system" if default_legacy else "user"


def _read_metadata(skill_dir: Path) -> dict[str, Any]:
    metadata = _read_json(_metadata_path(skill_dir))
    skill_md = _find_skill_markdown(skill_dir)
    skill_markdown = _read_text_file(skill_md) if skill_md else ""
    inferred_name, inferred_description = _extract_skill_markdown_summary(skill_markdown)
    stat = skill_dir.stat()
    created_at = datetime.fromtimestamp(stat.st_ctime, tz=UTC).isoformat()
    updated_at = datetime.fromtimestamp(stat.st_mtime, tz=UTC).isoformat()
    is_legacy_metadata = all(key not in metadata for key in ("skill_type", "published", "owner_username"))
    return {
        "id": skill_dir.name,
        "name": str(metadata.get("name") or inferred_name or skill_dir.name),
        "description": str(metadata.get("description") or inferred_description or ""),
        "enabled": bool(metadata.get("enabled", True)),
        "published": bool(metadata.get("published", True if is_legacy_metadata else False)),
        "skill_type": _normalize_skill_type(metadata.get("skill_type"), default_legacy=is_legacy_metadata),
        "owner_username": str(metadata["owner_username"]).strip() if metadata.get("owner_username") else None,
        "source": str(metadata.get("source") or "custom"),
        "created_at": str(metadata.get("created_at") or created_at),
        "updated_at": str(metadata.get("updated_at") or updated_at),
        "file_count": len(_list_files(skill_dir, can_edit=True)),
        "skill_markdown": skill_markdown,
    }


def _write_metadata(skill_dir: Path, values: dict[str, Any]) -> dict[str, Any]:
    existing = _read_metadata(skill_dir)
    metadata = {
        "id": skill_dir.name,
        "name": values.get("name", existing["name"]),
        "description": values.get("description", existing["description"]),
        "enabled": values.get("enabled", existing["enabled"]),
        "published": values.get("published", existing["published"]),
        "skill_type": values.get("skill_type", existing["skill_type"]),
        "owner_username": values.get("owner_username", existing["owner_username"]),
        "source": values.get("source", existing["source"]),
        "created_at": values.get("created_at", existing["created_at"]),
        "updated_at": _now(),
    }
    _write_json(_metadata_path(skill_dir), metadata)
    return metadata


def _is_owner(metadata: dict[str, Any], auth_context: AuthContext) -> bool:
    owner_username = str(metadata.get("owner_username") or "").strip().lower()
    return bool(owner_username) and owner_username == auth_context.username.strip().lower()


def _can_edit(metadata: dict[str, Any], auth_context: AuthContext) -> bool:
    return auth_context.is_admin or _is_owner(metadata, auth_context)


def _can_delete(metadata: dict[str, Any], auth_context: AuthContext) -> bool:
    return _can_edit(metadata, auth_context) and str(metadata.get("skill_type") or "user") != "system"


def _can_use(metadata: dict[str, Any], auth_context: AuthContext) -> bool:
    if not bool(metadata.get("enabled", True)):
        return False
    return _can_edit(metadata, auth_context) or bool(metadata.get("published", False))


def _can_view(metadata: dict[str, Any], auth_context: AuthContext) -> bool:
    return _can_edit(metadata, auth_context) or bool(metadata.get("published", False))


def _to_summary(skill_dir: Path, auth_context: AuthContext) -> dict[str, Any]:
    metadata = _read_metadata(skill_dir)
    return {
        "id": metadata["id"],
        "name": metadata["name"],
        "description": metadata["description"],
        "enabled": metadata["enabled"],
        "published": metadata["published"],
        "skill_type": metadata["skill_type"],
        "owner_username": metadata["owner_username"],
        "source": metadata["source"],
        "file_count": metadata["file_count"],
        "created_at": metadata["created_at"],
        "updated_at": metadata["updated_at"],
        "can_edit": _can_edit(metadata, auth_context),
        "can_delete": _can_delete(metadata, auth_context),
        "can_use": _can_use(metadata, auth_context),
    }


def list_skills(
    auth_context: AuthContext,
    *,
    q: str | None = None,
    enabled: bool | None = None,
    scope: str = "callable",
    agent_code: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if scope not in LIST_SCOPES:
        raise SkillValidationError("Skill 列表范围不合法")

    query = q.strip().lower() if q else ""
    allowed_ids: set[str] | None = None
    default_ids: list[str] = []
    if agent_code:
        from app.repositories.agents import allowed_skill_ids
        allowed_ids, default_ids = allowed_skill_ids(agent_code, auth_context)
    items = []
    for skill_dir in sorted(_storage_root().iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if not skill_dir.is_dir():
            continue
        summary = _to_summary(skill_dir, auth_context)
        if allowed_ids is not None and summary["id"] not in allowed_ids:
            continue
        if not _can_view(summary, auth_context):
            continue
        if scope == "owned" and not _is_owner(summary, auth_context):
            continue
        if scope in {"callable", "shared"} and not summary["can_use"]:
            continue
        if scope == "shared" and _is_owner(summary, auth_context):
            continue
        if enabled is not None and summary["enabled"] != enabled:
            continue
        if query and query not in f"{summary['name']} {summary['description']} {summary['id']}".lower():
            continue
        items.append({**summary, "is_default": summary["id"] in default_ids, "is_personal_binding": bool(agent_code and allowed_ids is not None and summary["id"] in allowed_ids and _is_owner(summary, auth_context))})
    return items, len(items)


def get_skill(skill_id: str, auth_context: AuthContext) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    metadata = _read_metadata(skill_dir)
    if not _can_view(metadata, auth_context):
        raise SkillPermissionError("你没有权限查看这个 Skill")
    can_edit = _can_edit(metadata, auth_context)
    return {
        **metadata,
        "can_edit": can_edit,
        "can_delete": _can_delete(metadata, auth_context),
        "can_use": _can_use(metadata, auth_context),
        "files": _list_files(skill_dir, can_edit=can_edit),
    }


def create_skill(payload: SkillCreate, auth_context: AuthContext) -> dict[str, Any]:
    skill_id = _new_skill_id(payload.name)
    skill_dir = _storage_root() / skill_id
    skill_dir.mkdir(parents=True)
    content = payload.content.strip() or f"# {payload.name}\n\n{payload.description}".strip() + "\n"
    (skill_dir / SKILL_MARKDOWN).write_text(content, encoding="utf-8")
    _write_metadata(
        skill_dir,
        {
            "name": payload.name,
            "description": payload.description,
            "enabled": payload.enabled,
            "published": payload.published,
            "skill_type": "user",
            "owner_username": auth_context.username,
            "source": "custom",
            "created_at": _now(),
        },
    )
    return get_skill(skill_id, auth_context)


def update_skill(skill_id: str, payload: SkillUpdate, auth_context: AuthContext) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    existing = _read_metadata(skill_dir)
    if not _can_edit(existing, auth_context):
        raise SkillPermissionError("只有 Skill 所有者可以编辑或发布这个 Skill")
    values = payload.model_dump(exclude_unset=True)
    if values:
        _write_metadata(skill_dir, values)
    return get_skill(skill_id, auth_context)


def delete_skill(skill_id: str, auth_context: AuthContext) -> bool:
    skill_dir = _skill_dir(skill_id)
    metadata = _read_metadata(skill_dir)
    if not _can_delete(metadata, auth_context):
        if str(metadata.get("skill_type") or "user") == "system":
            raise SkillPermissionError("系统自带 Skill 不支持删除")
        raise SkillPermissionError("只有 Skill 所有者可以删除这个 Skill")
    shutil.rmtree(skill_dir)
    return True


def _safe_member_path(base_dir: Path, member_name: str) -> Path:
    if member_name.startswith("/") or "\\" in member_name:
        raise SkillValidationError("Zip 包内文件路径不合法")
    destination = (base_dir / member_name).resolve()
    if not destination.is_relative_to(base_dir.resolve()):
        raise SkillValidationError("Zip 包内文件路径不能跳出 skill 目录")
    return destination


def import_skill_zip(filename: str, payload: bytes, auth_context: AuthContext) -> dict[str, Any]:
    if not filename or not filename.lower().endswith(".zip"):
        raise SkillValidationError("请上传 .zip 格式的标准 skill 包")

    if len(payload) > settings.skill_max_zip_size:
        raise SkillValidationError(f"Skill zip 包不能超过 {settings.skill_max_zip_mb}MB")

    with TemporaryDirectory() as temp_name:
        temp_dir = Path(temp_name)
        zip_path = temp_dir / "skill.zip"
        zip_path.write_bytes(payload)
        extract_dir = temp_dir / "extract"
        extract_dir.mkdir()
        try:
            with ZipFile(zip_path) as archive:
                for member in archive.infolist():
                    if member.is_dir():
                        _safe_member_path(extract_dir, member.filename).mkdir(parents=True, exist_ok=True)
                        continue
                    if member.file_size > MAX_FILE_SIZE and Path(member.filename).suffix.lower() in TEXT_SUFFIXES:
                        raise SkillValidationError("Skill 文本文件不能超过 300KB")
                    destination = _safe_member_path(extract_dir, member.filename)
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(member) as source, destination.open("wb") as target:
                        shutil.copyfileobj(source, target)
        except BadZipFile as exc:
            raise SkillValidationError("无法读取 zip 包，请确认文件未损坏") from exc

        skill_md = _find_skill_markdown(extract_dir)
        if not skill_md:
            raise SkillValidationError("标准 skill 包必须包含 SKILL.md")

        skill_markdown = _read_text_file(skill_md)
        inferred_name, inferred_description = _extract_skill_markdown_summary(skill_markdown)
        name = inferred_name or Path(filename).stem
        skill_id = _new_skill_id(name)
        skill_dir = _storage_root() / skill_id
        shutil.copytree(extract_dir, skill_dir)
        _write_metadata(
            skill_dir,
            {
                "name": name,
                "description": inferred_description,
                "enabled": True,
                "published": False,
                "skill_type": "user",
                "owner_username": auth_context.username,
                "source": "zip",
                "created_at": _now(),
            },
        )
        return get_skill(skill_id, auth_context)


def _resolve_skill_file(skill_dir: Path, file_path: str) -> Path:
    if not file_path or file_path.startswith("/") or "\\" in file_path:
        raise SkillValidationError("文件路径不合法")
    resolved = (skill_dir / file_path).resolve()
    if not resolved.is_relative_to(skill_dir.resolve()) or not resolved.is_file():
        raise SkillValidationError("文件不存在或不在 skill 目录内")
    return resolved


def read_skill_file(skill_id: str, file_path: str, auth_context: AuthContext) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    metadata = _read_metadata(skill_dir)
    if not _can_view(metadata, auth_context):
        raise SkillPermissionError("你没有权限查看这个 Skill")
    path = _resolve_skill_file(skill_dir, file_path)
    if not _is_text_previewable(path):
        raise SkillValidationError("该文件不是可在线预览的文本文件")
    return {"path": file_path, "content": _read_text_file(path)}


def update_skill_file(skill_id: str, file_path: str, content: str, auth_context: AuthContext) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    metadata = _read_metadata(skill_dir)
    if not _can_edit(metadata, auth_context):
        raise SkillPermissionError("只有 Skill 所有者可以编辑这个 Skill 文件")
    path = _resolve_skill_file(skill_dir, file_path)
    if not _is_text_previewable(path):
        raise SkillValidationError("该文件不是可编辑文本文件")
    path.write_text(content, encoding="utf-8")
    _write_metadata(skill_dir, {})
    return read_skill_file(skill_id, file_path, auth_context)


def get_prompt_skills(
    skill_ids: list[str],
    auth_context: AuthContext,
    *,
    agent_code: str | None = None,
    total_content_char_budget: int | None = None,
) -> list[dict[str, str]]:
    allowed_ids: set[str] | None = None
    if agent_code:
        from app.repositories.agents import allowed_skill_ids
        allowed_ids, _ = allowed_skill_ids(agent_code, auth_context)
    selected = []
    remaining_budget = total_content_char_budget
    for skill_id in skill_ids[:8]:
        if allowed_ids is not None and skill_id not in allowed_ids:
            continue
        try:
            skill_dir = _skill_dir(skill_id)
            detail = get_skill(skill_id, auth_context)
        except (SkillNotFoundError, SkillPermissionError):
            continue
        if not detail["can_use"]:
            continue
        content = detail["skill_markdown"][:6000]
        if remaining_budget is not None:
            if remaining_budget <= 0:
                break
            content = content[:remaining_budget]
            remaining_budget -= len(content)
        selected.append(
            {
                "id": detail["id"],
                "name": detail["name"],
                "description": detail["description"],
                "path": str(skill_dir),
                "content": content,
            }
        )
    return selected
