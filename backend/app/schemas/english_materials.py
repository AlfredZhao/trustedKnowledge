from pydantic import BaseModel, ConfigDict, Field, field_validator


class EnglishMaterialCreate(BaseModel):
    sequence_no: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=50)
    base_expression: str = Field(..., min_length=1, max_length=50)
    professional_sentence: str | None = Field(default=None, max_length=255)
    chinese_translation: str | None = Field(default=None, max_length=255)
    full_script: str | None = Field(default=None, max_length=4000)
    title: str | None = Field(default=None, max_length=200)
    flag: int = Field(default=0, ge=0, le=1)

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

    model_config = ConfigDict(from_attributes=True)


class EnglishMaterialListResponse(BaseModel):
    items: list[EnglishMaterialItem]
    total: int
    limit: int
    offset: int
