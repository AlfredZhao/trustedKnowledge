from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HistoryAskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    skill_ids: list[str] = Field(default_factory=list, max_length=8)
    execution_provider: Literal["codex", "history_ask_llm"] = "history_ask_llm"
    model_name: str = Field("", max_length=120)
    domain_code: Literal["history", "todos"] = "history"


class HistoryAskDomain(BaseModel):
    code: Literal["history", "todos"]
    name: str
    description: str
    source_tables: list[str] = Field(default_factory=list)


class HistoryAskDomainListResponse(BaseModel):
    items: list[HistoryAskDomain]


class HistoryAskFilters(BaseModel):
    keyword: str | None = None
    username: str | None = None
    type: str | None = None
    week: str | None = None
    day: str | None = None
    learn_level: int | None = None
    vector_status: int | None = None
    date_from: date | None = None
    date_to: date | None = None
    semantic_terms: list[str] = Field(default_factory=list)


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
    selected_skills: list[dict[str, str]] = Field(default_factory=list)
    domain: HistoryAskDomain
