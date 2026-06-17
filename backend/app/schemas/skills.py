from datetime import datetime

from pydantic import BaseModel, Field


class SkillFile(BaseModel):
    path: str
    size: int
    editable: bool


class SkillSummary(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool
    source: str
    file_count: int
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


class SkillUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = Field(None, max_length=2000)
    enabled: bool | None = None


class SkillFileUpdate(BaseModel):
    content: str = Field(..., max_length=300000)
