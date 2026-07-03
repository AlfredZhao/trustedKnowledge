from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

BlogFactoryStatus = Literal["待处理", "已处理", "已发布", "跳过"]
KnowledgeStatus = Literal["未发布", "已发布", "跳过"]


class BlogFactoryCreate(BaseModel):
    knowledge_id: int = Field(..., ge=1)
    task_content: str = Field(..., min_length=1)

    @field_validator("task_content")
    @classmethod
    def strip_task_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class BlogFactoryItem(BaseModel):
    id: int
    knowledge_id: int
    task_content: str
    question_snapshot: str
    answer_snapshot: str
    source_snapshot: str | None = None
    topic_tag_snapshot: str | None = None
    blog_status_snapshot: str | None = None
    copied_at: datetime | None = None
    factory_status: BlogFactoryStatus = "待处理"
    article_markdown: str | None = None
    article_title: str | None = None
    article_file_path: str | None = None
    article_checksum: str | None = None
    article_saved_at: datetime | None = None
    remote_post_id: str | None = None
    remote_publish_config_id: int | None = None
    remote_publish_state: str | None = None
    remote_submission_option: str | None = None
    remote_categories_snapshot: str | None = None
    remote_tags_snapshot: str | None = None
    remote_published_at: datetime | None = None
    remote_last_synced_at: datetime | None = None
    has_article: bool = False

    model_config = ConfigDict(from_attributes=True)


class BlogFactoryListResponse(BaseModel):
    items: list[BlogFactoryItem]
    total: int
    limit: int
    offset: int


class BlogFactoryStatusUpdate(BaseModel):
    factory_status: BlogFactoryStatus


class BlogFactoryContentStatusUpdate(BaseModel):
    blog_status: KnowledgeStatus


class BlogFactoryUpdate(BaseModel):
    task_content: str | None = Field(default=None, min_length=1)
    question_snapshot: str | None = Field(default=None, min_length=1, max_length=4000)
    answer_snapshot: str | None = Field(default=None, min_length=1)
    source_snapshot: str | None = Field(default=None, max_length=200)
    topic_tag_snapshot: str | None = Field(default=None, max_length=100, pattern=r"^[a-zA-Z0-9_,\s]+$")

    @field_validator("task_content", "question_snapshot", "answer_snapshot")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("source_snapshot", "topic_tag_snapshot", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class BlogFactoryArticleUpdate(BaseModel):
    article_markdown: str = Field(..., min_length=1)
    article_file_path: str | None = Field(default=None, max_length=500)

    @field_validator("article_markdown")
    @classmethod
    def strip_article_markdown(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("article_file_path", mode="before")
    @classmethod
    def empty_path_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None
