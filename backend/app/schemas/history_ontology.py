from datetime import datetime

from pydantic import BaseModel, Field


class HistoryOntologyTermBase(BaseModel):
    domain_code: str = Field("history", pattern="^(history|todos)$")
    name: str = Field(..., min_length=1, max_length=100)
    aliases: list[str] = Field(default_factory=list, max_length=12)
    description: str = Field("", max_length=1000)


class HistoryOntologyTermCreate(HistoryOntologyTermBase):
    pass


class HistoryOntologyTermUpdate(HistoryOntologyTermBase):
    pass


class HistoryOntologyTerm(HistoryOntologyTermBase):
    id: int
    created_at: datetime
    updated_at: datetime


class HistoryOntologyListResponse(BaseModel):
    items: list[HistoryOntologyTerm]
