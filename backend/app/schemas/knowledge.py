from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


KnowledgeStatus = Literal["未发布", "已发布", "跳过"]


class KnowledgeBase(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    answer: str = Field(..., min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100, pattern=r"^[a-zA-Z0-9_,\s]+$")
    blog_status: KnowledgeStatus = "未发布"

    @field_validator("question", "answer")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("source", "topic_tag", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class KnowledgeCreate(KnowledgeBase):
    pass


class KnowledgeUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=4000)
    answer: str | None = Field(default=None, min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100, pattern=r"^[a-zA-Z0-9_,\s]+$")
    blog_status: KnowledgeStatus | None = None

    @field_validator("question", "answer")
    @classmethod
    def strip_optional_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("source", "topic_tag", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class KnowledgeItem(KnowledgeBase):
    id: int
    created_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeListResponse(BaseModel):
    items: list[KnowledgeItem]
    total: int
    limit: int
    offset: int
