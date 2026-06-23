from datetime import datetime

from pydantic import BaseModel, Field


class SkillFile(BaseModel):
    path: str
    size: int
    readable: bool
    editable: bool


class SkillSummary(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool
    published: bool
    skill_type: str
    owner_username: str | None = None
    source: str
    file_count: int
    can_edit: bool
    can_delete: bool
    can_use: bool
    created_at: datetime
    updated_at: datetime


class SkillDetail(SkillSummary):
    files: list[SkillFile]
    skill_markdown: str


class SkillListResponse(BaseModel):
    items: list[SkillSummary]
    total: int


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field("", max_length=2000)
    content: str = Field("", max_length=200000)
    enabled: bool = True
    published: bool = False


class SkillUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = Field(None, max_length=2000)
    enabled: bool | None = None
    published: bool | None = None


class SkillFileUpdate(BaseModel):
    content: str = Field(..., max_length=300000)
