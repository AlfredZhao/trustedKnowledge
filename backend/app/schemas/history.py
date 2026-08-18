from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class HistoryItem(BaseModel):
    id: int
    type: str | None = None
    week: str | None = None
    day: str | None = None
    history_date: datetime | None = None
    content: str | None = None
    username: str | None = None
    v_needs_update: int | None = None
    learn_level: int | None = None
    similarity: float | None = None

    model_config = ConfigDict(from_attributes=True)


class HistorySummary(BaseModel):
    total: int
    types: list[str]
    users: list[str]
    user_types: dict[str, list[str]] = {}
    min_date: date | None = None
    max_date: date | None = None


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    limit: int
    offset: int
    summary: HistorySummary
