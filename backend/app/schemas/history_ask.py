from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HistoryAskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)


class HistoryAskFilters(BaseModel):
    keyword: str | None = None
    username: str | None = None


class HistoryAskStats(BaseModel):
    matched_count: int
    active_days: int
    min_date: date | None = None
    max_date: date | None = None
    type_counts: dict[str, int]
    week_counts: dict[str, int]
    learn_level_counts: dict[str, int]


class HistoryAskEvidence(BaseModel):
    id: int
    history_date: datetime | None = None
    type: str | None = None
    week: str | None = None
    day: str | None = None
    username: str | None = None
    content: str | None = None

    model_config = ConfigDict(from_attributes=True)


class HistoryAskResponse(BaseModel):
    answer: str
    filters: HistoryAskFilters
    stats: HistoryAskStats
    evidence: list[HistoryAskEvidence]
    llm_used: bool
    warning: str | None = None
