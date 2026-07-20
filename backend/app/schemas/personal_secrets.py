from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.validators import CONTROL_CHAR_PATTERN, normalize_optional_short_text


PersonalSecretRevealField = Literal["system_name", "login_url", "username", "password", "notes", "all"]


class PersonalSecretBase(BaseModel):
    system_name: str = Field(..., min_length=1, max_length=200)
    login_url: str | None = Field(default=None, max_length=1000)
    username: str | None = Field(default=None, max_length=500)
    password: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    tags: str | None = Field(default=None, max_length=500)

    @field_validator("system_name")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        if CONTROL_CHAR_PATTERN.search(stripped):
            raise ValueError("Field cannot contain control characters")
        return stripped

    @field_validator("login_url", "username", "password", "notes", "tags", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None, info) -> str | None:
        max_lengths = {"login_url": 1000, "username": 500, "password": 4000, "notes": 4000, "tags": 500}
        return normalize_optional_short_text(value, field_name=info.field_name, max_length=max_lengths[info.field_name])


class PersonalSecretCreate(PersonalSecretBase):
    pass


class PersonalSecretUpdate(BaseModel):
    system_name: str | None = Field(default=None, min_length=1, max_length=200)
    login_url: str | None = Field(default=None, max_length=1000)
    username: str | None = Field(default=None, max_length=500)
    password: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    tags: str | None = Field(default=None, max_length=500)

    @field_validator("system_name")
    @classmethod
    def strip_optional_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        if CONTROL_CHAR_PATTERN.search(stripped):
            raise ValueError("Field cannot contain control characters")
        return stripped

    @field_validator("login_url", "username", "password", "notes", "tags", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None, info) -> str | None:
        max_lengths = {"login_url": 1000, "username": 500, "password": 4000, "notes": 4000, "tags": 500}
        return normalize_optional_short_text(value, field_name=info.field_name, max_length=max_lengths[info.field_name])


class PersonalSecretItem(BaseModel):
    id: int
    system_name: str
    login_url: str | None = None
    username_preview: str | None = None
    notes_preview: str | None = None
    tags: str | None = None
    has_username: bool
    has_password: bool
    has_notes: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PersonalSecretListResponse(BaseModel):
    items: list[PersonalSecretItem]
    total: int
    limit: int
    offset: int


class PersonalSecretRevealRequest(BaseModel):
    field: PersonalSecretRevealField


class PersonalSecretRevealResponse(BaseModel):
    field: PersonalSecretRevealField
    value: str | None = None
    values: dict[str, str | None] | None = None
