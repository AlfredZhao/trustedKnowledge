"""Read-only aggregation of privacy-safe AI audit JSONL files."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.services.ai_audit import _AUDIT_LOG_PATH


TERMINAL_EVENTS = {"completed", "failed", "timed_out", "cancelled"}


def get_ai_audit_dashboard(*, days: int, username: str | None, source: str | None, model_name: str | None, event: str | None, limit: int, offset: int) -> dict[str, Any]:
    records = _read_audit_records()
    cutoff = datetime.now().astimezone() - timedelta(days=days)
    records = [record for record in records if record["timestamp"] >= cutoff]
    available_records = records[:]
    records = [
        record
        for record in records
        if (not username or record.get("username") == username)
        and (not source or record.get("source") == source)
        and (not model_name or record.get("model_name") == model_name)
        and (not event or record.get("event") == event)
    ]
    terminal_records = [record for record in records if record["event"] in TERMINAL_EVENTS]
    in_progress_records = _find_unfinished_records(records)
    display_records = sorted([*terminal_records, *in_progress_records], key=lambda record: record["timestamp"], reverse=True)
    total = len(display_records)
    return {
        "summary": _build_summary(terminal_records, in_progress_records),
        "daily": _build_daily(terminal_records),
        "by_user": _build_breakdown(terminal_records, "username"),
        "by_source": _build_breakdown(terminal_records, "source"),
        "by_model": _build_breakdown(terminal_records, "model_name"),
        "items": display_records[offset : offset + limit],
        "total": total,
        "available_users": _distinct(available_records, "username"),
        "available_sources": _distinct(available_records, "source"),
        "available_models": _distinct(available_records, "model_name"),
    }


def _read_audit_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(_AUDIT_LOG_PATH.parent.glob(f"{_AUDIT_LOG_PATH.name}*"), key=lambda item: item.stat().st_mtime):
        if not path.is_file():
            continue
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            try:
                value = json.loads(line)
                timestamp = datetime.fromisoformat(value["timestamp"])
            except (KeyError, TypeError, ValueError, json.JSONDecodeError):
                continue
            if not isinstance(value, dict) or value.get("event") not in {*TERMINAL_EVENTS, "started"}:
                continue
            value["timestamp"] = timestamp
            records.append(value)
    return records


def _find_unfinished_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    finished_job_ids = {record.get("job_id") for record in records if record["event"] in TERMINAL_EVENTS and record.get("job_id")}
    return [record for record in records if record["event"] == "started" and record.get("job_id") and record["job_id"] not in finished_job_ids]


def _build_summary(records: list[dict[str, Any]], in_progress: list[dict[str, Any]]) -> dict[str, Any]:
    event_counts = {event: sum(record["event"] == event for record in records) for event in TERMINAL_EVENTS}
    durations = [record["duration_ms"] for record in records if isinstance(record.get("duration_ms"), int)]
    estimated_costs = [record["estimated_cost_usd"] for record in records if isinstance(record.get("estimated_cost_usd"), (int, float))]
    total_calls = len(records)
    return {
        "total_calls": total_calls,
        "completed_calls": event_counts["completed"],
        "failed_calls": event_counts["failed"],
        "timed_out_calls": event_counts["timed_out"],
        "cancelled_calls": event_counts["cancelled"],
        "in_progress_calls": len(in_progress),
        "success_rate": round(event_counts["completed"] / total_calls * 100, 1) if total_calls else None,
        "total_tokens": sum(_int_value(record, "total_tokens") for record in records),
        "input_tokens": sum(_int_value(record, "input_tokens") for record in records),
        "cached_input_tokens": sum(_int_value(record, "cached_input_tokens") for record in records),
        "output_tokens": sum(_int_value(record, "output_tokens") for record in records),
        "average_duration_ms": round(sum(durations) / len(durations), 1) if durations else None,
        "estimated_cost_usd": round(sum(estimated_costs), 8) if estimated_costs else None,
        "estimated_cost_call_count": len(estimated_costs),
    }


def _build_daily(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[record["timestamp"].date().isoformat()].append(record)
    return [
        {"date": date, "calls": len(items), "total_tokens": sum(_int_value(item, "total_tokens") for item in items), "failed_calls": sum(item["event"] != "completed" for item in items)}
        for date, items in sorted(grouped.items())
    ]


def _build_breakdown(records: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record.get(field) or "未记录")].append(record)
    return sorted(({"key": key, "calls": len(items), "total_tokens": sum(_int_value(item, "total_tokens") for item in items)} for key, items in grouped.items()), key=lambda item: (-item["total_tokens"], item["key"]))


def _distinct(records: list[dict[str, Any]], field: str) -> list[str]:
    return sorted({str(record[field]) for record in records if record.get(field)})


def _int_value(record: dict[str, Any], field: str) -> int:
    value = record.get(field)
    return value if isinstance(value, int) and value >= 0 else 0
