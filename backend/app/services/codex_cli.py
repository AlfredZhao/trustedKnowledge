from __future__ import annotations

import asyncio
import json
import os
import tomllib
import time
from pathlib import Path
from tempfile import NamedTemporaryFile

from app.core.config import settings
from app.services.ai_audit import extract_usage, log_ai_call


# Keep this list aligned with the GPT-5.6 Codex model family.  The generic
# `gpt-5.6` name is a CLI default alias, not one of the selectable family tiers.
CODEX_AVAILABLE_MODELS = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]


def resolve_codex_model_name(model_name: str | None, project_root: Path) -> str | None:
    requested_model = (model_name or "").strip()
    return requested_model or read_codex_default_model(project_root)


def read_codex_default_model(project_root: Path) -> str | None:
    for config_path in _iter_codex_config_paths(project_root):
        try:
            with config_path.open("rb") as handle:
                config = tomllib.load(handle)
        except (OSError, tomllib.TOMLDecodeError):
            continue
        model_name = config.get("model")
        if isinstance(model_name, str) and model_name.strip():
            return model_name.strip()
    return None


async def run_codex_final(
    *,
    prompt: str,
    model_name: str | None,
    project_root: Path,
    timeout_seconds: int,
    audit_source: str = "unspecified",
    audit_username: str | None = None,
    audit_job_id: str | None = None,
) -> str:
    """Run a read-only Codex request and return only its final response."""
    resolved_model = resolve_codex_model_name(model_name, project_root)
    with NamedTemporaryFile(prefix="trustedknowledge-codex-", suffix=".txt", delete=False) as temp_file:
        output_path = Path(temp_file.name)
    args = [settings.codex_bin, "exec"]
    if resolved_model:
        args.extend(["--model", resolved_model])
    args.extend(["--cd", str(project_root), "--sandbox", "read-only", "--color", "never", "--json", "--output-last-message", str(output_path), "-"])

    process: asyncio.subprocess.Process | None = None
    started_at = time.monotonic()
    log_ai_call(
        "started",
        provider="codex",
        source=audit_source,
        username=audit_username,
        job_id=audit_job_id,
        model_name=resolved_model,
    )
    try:
        process = await asyncio.create_subprocess_exec(
            *args,
            cwd=project_root,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await asyncio.wait_for(process.communicate(prompt.encode("utf-8")), timeout=timeout_seconds)
        output = output_path.read_text(encoding="utf-8").strip() if output_path.exists() else ""
        if process.returncode != 0:
            detail = stderr_bytes.decode("utf-8", errors="replace").strip() or stdout_bytes.decode("utf-8", errors="replace").strip()
            raise RuntimeError(detail or f"Codex exited with code {process.returncode}.")
        if not output:
            raise RuntimeError("Codex 未返回最终回答。")
        log_ai_call(
            "completed",
            provider="codex",
            source=audit_source,
            username=audit_username,
            job_id=audit_job_id,
            model_name=resolved_model,
            duration_ms=round((time.monotonic() - started_at) * 1000),
            usage=extract_codex_usage(stdout_bytes),
        )
        return output
    except TimeoutError as exc:
        if process is not None and process.returncode is None:
            process.kill()
            await process.wait()
        log_ai_call("timed_out", provider="codex", source=audit_source, username=audit_username, job_id=audit_job_id, model_name=resolved_model, duration_ms=round((time.monotonic() - started_at) * 1000), error_type=type(exc).__name__)
        raise RuntimeError("Codex 问数任务超时。") from exc
    except asyncio.CancelledError:
        if process is not None and process.returncode is None:
            process.kill()
            await process.wait()
        log_ai_call("cancelled", provider="codex", source=audit_source, username=audit_username, job_id=audit_job_id, model_name=resolved_model, duration_ms=round((time.monotonic() - started_at) * 1000), error_type="CancelledError")
        raise
    except OSError as exc:
        log_ai_call("failed", provider="codex", source=audit_source, username=audit_username, job_id=audit_job_id, model_name=resolved_model, duration_ms=round((time.monotonic() - started_at) * 1000), error_type=type(exc).__name__)
        raise RuntimeError(f"无法启动 Codex：{exc}") from exc
    except Exception as exc:
        log_ai_call("failed", provider="codex", source=audit_source, username=audit_username, job_id=audit_job_id, model_name=resolved_model, duration_ms=round((time.monotonic() - started_at) * 1000), error_type=type(exc).__name__)
        raise
    finally:
        output_path.unlink(missing_ok=True)


def _iter_codex_config_paths(project_root: Path) -> list[Path]:
    paths: list[Path] = []
    current = project_root
    while True:
        paths.append(current / ".codex" / "config.toml")
        if current.parent == current:
            break
        current = current.parent
    codex_home = os.environ.get("CODEX_HOME", "").strip()
    paths.append((Path(codex_home).expanduser() if codex_home else Path.home() / ".codex") / "config.toml")
    return paths


def extract_codex_usage(output: bytes | str | list[str]) -> dict[str, int | None] | None:
    """Read usage from the final JSONL event when this Codex CLI version emits it."""
    if isinstance(output, bytes):
        lines = output.decode("utf-8", errors="replace").splitlines()
    elif isinstance(output, str):
        lines = output.splitlines()
    else:
        lines = output
    for line in reversed(lines):
        try:
            event = json.loads(line)
        except (TypeError, json.JSONDecodeError):
            continue
        if isinstance(event, dict):
            usage = extract_usage(event.get("usage"))
            if usage is not None:
                return usage
    return None
