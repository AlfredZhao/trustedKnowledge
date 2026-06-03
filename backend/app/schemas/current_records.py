from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


WeekValue = Literal[
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6",
    "W7",
    "W8",
    "W9",
    "W10",
    "W11",
    "W12",
    "W13",
    "W14",
    "W15",
    "W16",
    "W17",
    "W18",
    "W19",
    "W20",
    "W21",
    "W22",
    "W23",
    "W24",
    "W25",
    "W26",
    "W27",
    "W28",
    "W29",
    "W30",
    "W31",
    "W32",
    "W33",
    "W34",
    "W35",
    "W36",
    "W37",
    "W38",
    "W39",
    "W40",
    "W41",
    "W42",
    "W43",
    "W44",
    "W45",
    "W46",
    "W47",
    "W48",
]
DayValue = Literal["D1", "D2", "D3", "D4", "D5", "D6", "D7"]


class CurrentRecordCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=30)
    type: str = Field(..., min_length=1, max_length=40)
    content: str | None = Field(default=None, max_length=4000)

    @field_validator("username", "type")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CurrentRecordUpdate(BaseModel):
    week: WeekValue
    day: DayValue
    content: str | None = Field(default=None, max_length=4000)

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CurrentRecordItem(BaseModel):
    id: int
    type: str
    week: str
    day: str
    content: str | None = None
    username: str
    learn_level: int | None = None

    model_config = ConfigDict(from_attributes=True)


class CurrentRecordListResponse(BaseModel):
    items: list[CurrentRecordItem]
    total: int
    limit: int
    offset: int


class CurrentRecordOptions(BaseModel):
    users: list[str]
    types: list[str]
    user_types: dict[str, list[str]]
    weeks: list[str]
    days: list[str]
    learn_levels: list[int]
