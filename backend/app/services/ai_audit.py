"""Append-only, privacy-safe audit records for actual AI provider calls."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

from app.core.config import settings


_AUDIT_LOGGER_NAME = "trusted_knowledge.ai_audit"
_AUDIT_LOG_PATH = Path(__file__).resolve().parents[3] / "logs" / "ai-audit.log"
_LOCAL_TIMEZONE = "Asia/Shanghai"


def log_ai_call(
    event: Literal["started", "completed", "failed", "timed_out", "cancelled"],
    *,
    provider: str,
    source: str,
    username: str | None = None,
    job_id: str | None = None,
    model_name: str | None = None,
    duration_ms: int | None = None,
    error_type: str | None = None,
    usage: dict[str, int | None] | None = None,
) -> None:
    """Write one JSON line without prompts, API keys, or provider response bodies."""
    logger = _get_audit_logger()
    normalized_usage = _normalize_usage(usage)
    record = {
        "timestamp": datetime.now(ZoneInfo(_LOCAL_TIMEZONE)).isoformat(),
        "timezone": _LOCAL_TIMEZONE,
        "event": event,
        "provider": provider,
        "source": source,
        "username": username or None,
        "job_id": job_id or None,
        "model_name": model_name or None,
        "duration_ms": duration_ms,
        "error_type": error_type or None,
        **normalized_usage,
        **_estimate_cost(model_name, normalized_usage),
    }
    logger.info(json.dumps(record, ensure_ascii=False, separators=(",", ":")))


def extract_usage(value: object) -> dict[str, int | None] | None:
    """Normalize standard API/CLI usage objects without inferring missing counts."""
    if not isinstance(value, dict):
        return None
    input_tokens = _read_usage_int(value, "input_tokens", "prompt_tokens")
    output_tokens = _read_usage_int(value, "output_tokens", "completion_tokens")
    cached_input_tokens = _read_usage_int(value, "cached_input_tokens")
    details = value.get("prompt_tokens_details") or value.get("input_tokens_details")
    if cached_input_tokens is None and isinstance(details, dict):
        cached_input_tokens = _read_usage_int(details, "cached_tokens")
    total_tokens = _read_usage_int(value, "total_tokens")
    if total_tokens is None and input_tokens is not None and output_tokens is not None:
        total_tokens = input_tokens + output_tokens
    if input_tokens is None and output_tokens is None and total_tokens is None:
        return None
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cached_input_tokens": cached_input_tokens,
        "total_tokens": total_tokens,
    }


def _normalize_usage(usage: dict[str, int | None] | None) -> dict[str, int | bool | None]:
    if usage is None:
        return {"usage_available": False, "input_tokens": None, "output_tokens": None, "cached_input_tokens": None, "total_tokens": None}
    return {"usage_available": True, **usage}


def _read_usage_int(value: dict[object, object], *keys: str) -> int | None:
    for key in keys:
        candidate = value.get(key)
        if isinstance(candidate, int) and candidate >= 0:
            return candidate
    return None


def _estimate_cost(model_name: str | None, usage: dict[str, int | bool | None]) -> dict[str, str | float | None]:
    pricing = _read_pricing().get(model_name or "")
    if not pricing or not usage["usage_available"] or not isinstance(usage["input_tokens"], int) or not isinstance(usage["output_tokens"], int):
        return {"cost_status": "unavailable", "estimated_cost_usd": None}
    input_rate = pricing.get("input_per_million_usd")
    output_rate = pricing.get("output_per_million_usd")
    cached_rate = pricing.get("cached_input_per_million_usd", input_rate)
    if not all(isinstance(rate, (int, float)) and rate >= 0 for rate in (input_rate, output_rate, cached_rate)):
        return {"cost_status": "unavailable", "estimated_cost_usd": None}
    input_tokens = int(usage["input_tokens"])
    cached_tokens = min(int(usage["cached_input_tokens"] or 0), input_tokens)
    output_tokens = int(usage["output_tokens"])
    amount = ((input_tokens - cached_tokens) * float(input_rate) + cached_tokens * float(cached_rate) + output_tokens * float(output_rate)) / 1_000_000
    return {"cost_status": "estimated", "estimated_cost_usd": round(amount, 8)}


def _read_pricing() -> dict[str, dict[str, object]]:
    try:
        value = json.loads(getattr(settings, "ai_pricing_json", "{}"))
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def _get_audit_logger() -> logging.Logger:
    logger = logging.getLogger(_AUDIT_LOGGER_NAME)
    if logger.handlers:
        return logger

    _AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(_AUDIT_LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=10, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger
