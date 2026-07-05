from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.validators import normalize_optional_short_text, normalize_optional_topic_tag


KnowledgeStatus = Literal["未发布", "已发布", "跳过"]


class KnowledgeBase(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    answer: str = Field(..., min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100)
    blog_status: KnowledgeStatus = "未发布"

    @field_validator("question", "answer")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("source", mode="before")
    @classmethod
    def normalize_source(cls, value: str | None) -> str | None:
        return normalize_optional_short_text(value, field_name="source", max_length=200)

    @field_validator("topic_tag", mode="before")
    @classmethod
    def normalize_topic_tag(cls, value: str | None) -> str | None:
        return normalize_optional_topic_tag(value)


class KnowledgeCreate(KnowledgeBase):
    pass


class KnowledgeMergeRequest(KnowledgeBase):
    knowledge_ids: list[int] = Field(..., min_length=2, max_length=100)
    blog_status: Literal["未发布"] = "未发布"

    @field_validator("knowledge_ids")
    @classmethod
    def require_distinct_ids(cls, value: list[int]) -> list[int]:
        if any(item <= 0 for item in value):
            raise ValueError("Knowledge IDs must be positive")
        if len(set(value)) != len(value):
            raise ValueError("Knowledge IDs must be distinct")
        return value


class KnowledgeUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=4000)
    answer: str | None = Field(default=None, min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100)
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

    @field_validator("source", mode="before")
    @classmethod
    def normalize_source(cls, value: str | None) -> str | None:
        return normalize_optional_short_text(value, field_name="source", max_length=200)

    @field_validator("topic_tag", mode="before")
    @classmethod
    def normalize_topic_tag(cls, value: str | None) -> str | None:
        return normalize_optional_topic_tag(value)


class KnowledgeItem(KnowledgeBase):
    id: int
    created_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeListResponse(BaseModel):
    items: list[KnowledgeItem]
    total: int
    limit: int
    offset: int
