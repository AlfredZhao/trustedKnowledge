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
from app.schemas.skills import SkillCreate, SkillUpdate


METADATA_FILE = ".trusted-skill.json"
SKILL_MARKDOWN = "SKILL.md"
MAX_ZIP_SIZE = 8 * 1024 * 1024
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


class SkillNotFoundError(Exception):
    pass


class SkillValidationError(Exception):
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


def _is_editable(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES and path.stat().st_size <= MAX_FILE_SIZE


def _read_text_file(path: Path) -> str:
    if not path.exists() or not path.is_file():
        return ""
    if not _is_editable(path):
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return ""


def _list_files(skill_dir: Path) -> list[dict[str, Any]]:
    files = []
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file() or path.name == METADATA_FILE:
            continue
        relative_path = path.relative_to(skill_dir).as_posix()
        files.append({"path": relative_path, "size": path.stat().st_size, "editable": _is_editable(path)})
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


def _read_metadata(skill_dir: Path) -> dict[str, Any]:
    metadata = _read_json(_metadata_path(skill_dir))
    skill_md = _find_skill_markdown(skill_dir)
    skill_markdown = _read_text_file(skill_md) if skill_md else ""
    inferred_name, inferred_description = _extract_skill_markdown_summary(skill_markdown)
    stat = skill_dir.stat()
    created_at = datetime.fromtimestamp(stat.st_ctime, tz=UTC).isoformat()
    updated_at = datetime.fromtimestamp(stat.st_mtime, tz=UTC).isoformat()
    return {
        "id": skill_dir.name,
        "name": str(metadata.get("name") or inferred_name or skill_dir.name),
        "description": str(metadata.get("description") or inferred_description or ""),
        "enabled": bool(metadata.get("enabled", True)),
        "source": str(metadata.get("source") or "custom"),
        "created_at": str(metadata.get("created_at") or created_at),
        "updated_at": str(metadata.get("updated_at") or updated_at),
        "file_count": len(_list_files(skill_dir)),
        "skill_markdown": skill_markdown,
    }


def _write_metadata(skill_dir: Path, values: dict[str, Any]) -> dict[str, Any]:
    existing = _read_metadata(skill_dir)
    metadata = {
        "id": skill_dir.name,
        "name": values.get("name", existing["name"]),
        "description": values.get("description", existing["description"]),
        "enabled": values.get("enabled", existing["enabled"]),
        "source": values.get("source", existing["source"]),
        "created_at": values.get("created_at", existing["created_at"]),
        "updated_at": _now(),
    }
    _write_json(_metadata_path(skill_dir), metadata)
    return metadata


def _to_summary(skill_dir: Path) -> dict[str, Any]:
    metadata = _read_metadata(skill_dir)
    return {key: metadata[key] for key in ["id", "name", "description", "enabled", "source", "file_count", "created_at", "updated_at"]}


def list_skills(*, q: str | None = None, enabled: bool | None = None) -> tuple[list[dict[str, Any]], int]:
    query = q.strip().lower() if q else ""
    items = []
    for skill_dir in sorted(_storage_root().iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if not skill_dir.is_dir():
            continue
        summary = _to_summary(skill_dir)
        if enabled is not None and summary["enabled"] != enabled:
            continue
        if query and query not in f"{summary['name']} {summary['description']} {summary['id']}".lower():
            continue
        items.append(summary)
    return items, len(items)


def get_skill(skill_id: str) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    metadata = _read_metadata(skill_dir)
    return {**metadata, "files": _list_files(skill_dir)}


def create_skill(payload: SkillCreate) -> dict[str, Any]:
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
            "source": "custom",
            "created_at": _now(),
        },
    )
    return get_skill(skill_id)


def update_skill(skill_id: str, payload: SkillUpdate) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    values = payload.model_dump(exclude_unset=True)
    if values:
        _write_metadata(skill_dir, values)
    return get_skill(skill_id)


def delete_skill(skill_id: str) -> bool:
    skill_dir = _skill_dir(skill_id)
    shutil.rmtree(skill_dir)
    return True


def _safe_member_path(base_dir: Path, member_name: str) -> Path:
    if member_name.startswith("/") or "\\" in member_name:
        raise SkillValidationError("Zip 包内文件路径不合法")
    destination = (base_dir / member_name).resolve()
    if not destination.is_relative_to(base_dir.resolve()):
        raise SkillValidationError("Zip 包内文件路径不能跳出 skill 目录")
    return destination


def import_skill_zip(filename: str, payload: bytes) -> dict[str, Any]:
    if not filename or not filename.lower().endswith(".zip"):
        raise SkillValidationError("请上传 .zip 格式的标准 skill 包")

    if len(payload) > MAX_ZIP_SIZE:
        raise SkillValidationError("Skill zip 包不能超过 8MB")

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
                "source": "zip",
                "created_at": _now(),
            },
        )
        return get_skill(skill_id)


def _resolve_skill_file(skill_dir: Path, file_path: str) -> Path:
    if not file_path or file_path.startswith("/") or "\\" in file_path:
        raise SkillValidationError("文件路径不合法")
    resolved = (skill_dir / file_path).resolve()
    if not resolved.is_relative_to(skill_dir.resolve()) or not resolved.is_file():
        raise SkillValidationError("文件不存在或不在 skill 目录内")
    return resolved


def read_skill_file(skill_id: str, file_path: str) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    path = _resolve_skill_file(skill_dir, file_path)
    if not _is_editable(path):
        raise SkillValidationError("该文件不是可编辑文本文件")
    return {"path": file_path, "content": _read_text_file(path)}


def update_skill_file(skill_id: str, file_path: str, content: str) -> dict[str, Any]:
    skill_dir = _skill_dir(skill_id)
    path = _resolve_skill_file(skill_dir, file_path)
    if not _is_editable(path):
        raise SkillValidationError("该文件不是可编辑文本文件")
    path.write_text(content, encoding="utf-8")
    _write_metadata(skill_dir, {})
    return read_skill_file(skill_id, file_path)


def get_prompt_skills(skill_ids: list[str]) -> list[dict[str, str]]:
    selected = []
    for skill_id in skill_ids[:8]:
        try:
            detail = get_skill(skill_id)
        except SkillNotFoundError:
            continue
        if not detail["enabled"]:
            continue
        selected.append(
            {
                "id": detail["id"],
                "name": detail["name"],
                "description": detail["description"],
                "content": detail["skill_markdown"][:6000],
            }
        )
    return selected
