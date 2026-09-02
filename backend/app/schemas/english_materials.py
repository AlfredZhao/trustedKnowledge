from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EnglishMaterialCardSection(BaseModel):
    key: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=80)
    value: str = Field(default="", max_length=2000)
    visible: bool = True
    copyable: bool = True
    order: int = Field(default=0, ge=0, le=10000)


class EnglishMaterialCardSections(BaseModel):
    schema_version: Literal[1] = 1
    template: dict[str, str] | None = None
    sections: list[EnglishMaterialCardSection] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def require_unique_section_keys(self) -> "EnglishMaterialCardSections":
        if len({section.key for section in self.sections}) != len(self.sections):
            raise ValueError("card section keys must be unique")
        return self


class EnglishMaterialCreate(BaseModel):
    sequence_no: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=50)
    base_expression: str = Field(..., min_length=1, max_length=50)
    professional_sentence: str | None = Field(default=None, max_length=255)
    chinese_translation: str | None = Field(default=None, max_length=255)
    full_script: str | None = Field(default=None, max_length=4000)
    title: str | None = Field(default=None, max_length=200)
    flag: int = Field(default=0, ge=0, le=1)
    card_sections: EnglishMaterialCardSections | None = None

    @field_validator(
        "category",
        "base_expression",
        "professional_sentence",
        "chinese_translation",
        "full_script",
        "title",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("base_expression")
    @classmethod
    def require_base_expression(cls, value: str | None) -> str:
        if not value:
            raise ValueError("base_expression cannot be blank")
        return value


class EnglishMaterialGenerationRequest(BaseModel):
    topic_mode: Literal["trend", "truth", "motivation", "workplace", "custom"] = "trend"
    topic: str | None = Field(default=None, max_length=300)
    skill_ids: list[str] = Field(default_factory=list, max_length=8)
    execution_provider: Literal["codex", "history_ask_llm"] = "codex"
    model_name: str = Field(default="", max_length=120)

    @field_validator("topic", mode="before")
    @classmethod
    def strip_optional_topic(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def require_custom_topic(self) -> "EnglishMaterialGenerationRequest":
        if self.topic_mode == "custom" and not self.topic:
            raise ValueError("自定义主题不能为空")
        return self


class EnglishMaterialGenerationResult(BaseModel):
    category: Literal["AI生成"] = "AI生成"
    title: str = Field(..., min_length=1, max_length=200)
    base_expression: str = Field(..., min_length=1, max_length=50)
    professional_sentence: str = Field(..., min_length=1, max_length=255)
    chinese_translation: str = Field(..., min_length=1, max_length=255)
    full_script: str = Field(..., min_length=1, max_length=4000)


class EnglishMaterialCompletionRequest(BaseModel):
    full_script: str = Field(..., min_length=1, max_length=4000)
    skill_ids: list[str] = Field(default_factory=list, max_length=8)
    execution_provider: Literal["codex", "history_ask_llm"] = "codex"
    model_name: str = Field(default="", max_length=120)

    @field_validator("full_script", mode="before")
    @classmethod
    def strip_full_script(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class EnglishMaterialCompletionResult(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    base_expression: str = Field(..., min_length=1, max_length=50)
    professional_sentence: str = Field(..., min_length=1, max_length=255)
    chinese_translation: str = Field(..., min_length=1, max_length=255)
    card_sections: EnglishMaterialCardSections | None = None


class EnglishMaterialCompletionJobSnapshot(BaseModel):
    job_id: str
    status: Literal["running", "completed", "failed", "cancelled"]
    execution_provider: Literal["codex", "history_ask_llm"]
    model_name: str
    result: EnglishMaterialCompletionResult | None = None
    error_message: str | None = None
    started_at: str
    completed_at: str | None = None


class EnglishMaterialUpdate(BaseModel):
    sequence_no: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=50)
    base_expression: str | None = Field(default=None, min_length=1, max_length=50)
    professional_sentence: str | None = Field(default=None, max_length=255)
    chinese_translation: str | None = Field(default=None, max_length=255)
    full_script: str | None = Field(default=None, max_length=4000)
    title: str | None = Field(default=None, max_length=200)
    flag: int | None = Field(default=None, ge=0, le=1)
    card_sections: EnglishMaterialCardSections | None = None

    @field_validator(
        "category",
        "base_expression",
        "professional_sentence",
        "chinese_translation",
        "full_script",
        "title",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("base_expression")
    @classmethod
    def require_base_expression_when_present(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("base_expression cannot be blank")
        return value


class EnglishMaterialItem(BaseModel):
    id: int
    sequence_no: int | None = None
    category: str | None = None
    base_expression: str | None = None
    professional_sentence: str | None = None
    chinese_translation: str | None = None
    full_script: str | None = None
    flag: int
    title: str | None = None
    v_needs_update: int | None = None
    similarity: float | None = None
    card_sections: EnglishMaterialCardSections | None = None

    model_config = ConfigDict(from_attributes=True)


class EnglishMaterialListResponse(BaseModel):
    items: list[EnglishMaterialItem]
    total: int
    limit: int
    offset: int
