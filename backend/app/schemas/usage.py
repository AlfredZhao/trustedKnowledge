from datetime import datetime

from pydantic import BaseModel


class LlmUsageSample(BaseModel):
    sample_time: datetime
    used_amount: float
    total_budget: float
    remaining_budget: float
    budget_duration: str | None = None
    next_reset_at: datetime


class LlmUsageResponse(BaseModel):
    items: list[LlmUsageSample]
    total: int
