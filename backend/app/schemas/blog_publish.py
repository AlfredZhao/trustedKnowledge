from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.blog_factory import BlogFactoryItem


BlogPublishType = Literal["METAWEBLOG_API"]
BlogPublishSubmissionOption = Literal["CNBLOGS_HOME", "PERSONAL_ONLY"]


class BlogPublishConfigBase(BaseModel):
    blog_type: BlogPublishType = "METAWEBLOG_API"
    blog_url: str = Field(..., min_length=1, max_length=500)
    username: str = Field(..., min_length=1, max_length=100)
    api_url: str = Field(..., min_length=1, max_length=500)
    blog_name: str | None = Field(default=None, max_length=200)

    @field_validator("blog_url", "username", "api_url")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("blog_name", mode="before")
    @classmethod
    def empty_name_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class BlogPublishConfigCreate(BlogPublishConfigBase):
    password: str = Field(..., min_length=1, max_length=500)
    is_default: bool = False

    @field_validator("password")
    @classmethod
    def strip_password(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class BlogPublishConfigUpdate(BaseModel):
    blog_type: BlogPublishType | None = None
    blog_url: str | None = Field(default=None, min_length=1, max_length=500)
    username: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, max_length=500)
    api_url: str | None = Field(default=None, min_length=1, max_length=500)
    blog_name: str | None = Field(default=None, max_length=200)
    is_default: bool | None = None

    @field_validator("blog_url", "username", "api_url")
    @classmethod
    def strip_optional_required_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("password", "blog_name", mode="before")
    @classmethod
    def empty_optional_fields_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class BlogPublishConfig(BaseModel):
    id: int
    blog_type: BlogPublishType = "METAWEBLOG_API"
    blog_url: str
    username: str
    api_url: str
    blog_name: str | None = None
    blog_id: str | None = None
    is_default: bool = False
    has_password: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BlogPublishConfigListResponse(BaseModel):
    items: list[BlogPublishConfig]
    total: int


class BlogPublishConfigValidationRequest(BlogPublishConfigBase):
    password: str = Field(..., min_length=1, max_length=500)

    @field_validator("password")
    @classmethod
    def strip_password(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class BlogPublishConfigValidationResponse(BaseModel):
    blog_id: str
    blog_name: str | None = None
    blog_url: str | None = None
    message: str


class BlogPublishCategory(BaseModel):
    category_id: str | None = None
    title: str
    description: str | None = None


class BlogPublishCategoryListResponse(BaseModel):
    items: list[BlogPublishCategory]
    total: int


class BlogFactoryPublishRequest(BaseModel):
    config_id: int | None = Field(default=None, ge=1)
    article_markdown: str = Field(..., min_length=1)
    article_title: str | None = Field(default=None, max_length=300)
    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    submission_option: BlogPublishSubmissionOption = "CNBLOGS_HOME"
    publish: bool = True

    @field_validator("article_markdown")
    @classmethod
    def strip_article_markdown(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("article_title", mode="before")
    @classmethod
    def empty_title_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("categories", "tags", mode="before")
    @classmethod
    def normalize_tags(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Tags must be an array")
        normalized: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Tags must be strings")
            stripped = item.strip()
            if stripped:
                normalized.append(stripped[:100])
        return normalized


class BlogFactoryPublishResponse(BaseModel):
    item: BlogFactoryItem
    config_id: int
    post_id: str
    blog_name: str | None = None
    blog_url: str | None = None
    published: bool
