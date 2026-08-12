from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


HistoryAskDomainCode = Literal["history", "todos", "knowledge", "english_materials"]


class HistoryAskQuickQuestionCreate(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    domain_code: HistoryAskDomainCode = "history"


class HistoryAskQuickQuestionUpdate(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)


class HistoryAskQuickQuestion(BaseModel):
    id: int
    question: str
    domain_code: HistoryAskDomainCode
    created_at: datetime
    updated_at: datetime


class HistoryAskQuickQuestionListResponse(BaseModel):
    items: list[HistoryAskQuickQuestion]
