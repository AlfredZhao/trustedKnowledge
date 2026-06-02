from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


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

    model_config = ConfigDict(from_attributes=True)
