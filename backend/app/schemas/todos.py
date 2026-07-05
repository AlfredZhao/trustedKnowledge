from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.current_records import DayValue, WeekValue
from app.schemas.validators import normalize_optional_short_text, normalize_optional_topic_tag


TodoStatus = Literal["待处理", "处理中", "已完成"]


class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=4000)
    content: str = Field(..., min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100)
    todo_status: TodoStatus = "待处理"

    @field_validator("title", "content")
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


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=4000)
    content: str | None = Field(default=None, min_length=1)
    source: str | None = Field(default=None, max_length=200)
    topic_tag: str | None = Field(default=None, max_length=100)
    todo_status: TodoStatus | None = None

    @field_validator("title", "content")
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


class TodoCurrentAppendTarget(BaseModel):
    username: str = Field(..., min_length=1, max_length=30)
    type: str = Field(..., min_length=1, max_length=40)
    week: WeekValue | None = None
    day: DayValue | None = None
    replace_existing_content: bool = False

    @field_validator("username", "type")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class TodoItem(TodoBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TodoListResponse(BaseModel):
    items: list[TodoItem]
    total: int
    limit: int
    offset: int
