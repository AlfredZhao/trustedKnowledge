from datetime import datetime

from pydantic import BaseModel


class AiAuditSummary(BaseModel):
    total_calls: int
    completed_calls: int
    failed_calls: int
    timed_out_calls: int
    cancelled_calls: int
    in_progress_calls: int
    success_rate: float | None = None
    total_tokens: int
    input_tokens: int
    output_tokens: int
    cached_input_tokens: int
    average_duration_ms: float | None = None
    estimated_cost_usd: float | None = None
    estimated_cost_call_count: int


class AiAuditBreakdownItem(BaseModel):
    key: str
    calls: int
    total_tokens: int


class AiAuditDailyItem(BaseModel):
    date: str
    calls: int
    total_tokens: int
    failed_calls: int


class AiAuditRecord(BaseModel):
    timestamp: datetime
    event: str
    provider: str | None = None
    source: str | None = None
    username: str | None = None
    job_id: str | None = None
    model_name: str | None = None
    duration_ms: int | None = None
    error_type: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cached_input_tokens: int | None = None
    total_tokens: int | None = None
    usage_available: bool = False
    cost_status: str | None = None
    estimated_cost_usd: float | None = None


class AiAuditDashboardResponse(BaseModel):
    summary: AiAuditSummary
    daily: list[AiAuditDailyItem]
    by_user: list[AiAuditBreakdownItem]
    by_source: list[AiAuditBreakdownItem]
    by_model: list[AiAuditBreakdownItem]
    items: list[AiAuditRecord]
    total: int
    available_users: list[str]
    available_sources: list[str]
    available_models: list[str]
