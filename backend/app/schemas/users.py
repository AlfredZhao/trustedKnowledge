from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


UserRole = Literal["USER", "PARENT"]
UserStatus = Literal["ACTIVE", "DISABLED"]
AdminModuleCode = Literal["aiCoding", "usage"]
AdminModuleAccessLevel = Literal["SUPER_ADMIN_ONLY", "ADMIN_ROLE"]


class ManagedUserItem(BaseModel):
    user_id: int
    username: str
    display_name: str | None = None
    role_code: UserRole
    is_admin_role: bool = False
    status: UserStatus
    has_password: bool
    parent_count: int
    child_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ManagedUserListResponse(BaseModel):
    items: list[ManagedUserItem]
    total: int


class ManagedUserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    display_name: str | None = Field(default=None, max_length=100)
    password: str = Field(..., min_length=6, max_length=200)
    role_code: UserRole = "USER"
    is_admin_role: bool = False

    @field_validator("username", "display_name", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ManagedUserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    role_code: UserRole | None = None
    is_admin_role: bool | None = None
    status: UserStatus | None = None

    @field_validator("display_name", mode="before")
    @classmethod
    def strip_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ManagedUserPasswordReset(BaseModel):
    password: str = Field(..., min_length=6, max_length=200)


class UserRelationItem(BaseModel):
    relation_id: int
    parent_user_id: int
    parent_username: str
    child_user_id: int
    child_username: str
    relation_type: str
    status: UserStatus
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserRelationListResponse(BaseModel):
    items: list[UserRelationItem]
    total: int


class UserRelationCreate(BaseModel):
    parent_user_id: int = Field(..., ge=1)
    child_user_id: int = Field(..., ge=1)
    relation_type: str = Field("GUARDIAN", min_length=1, max_length=30)

    @field_validator("relation_type")
    @classmethod
    def normalize_relation_type(cls, value: str) -> str:
        stripped = value.strip().upper()
        if not stripped:
            raise ValueError("relation_type cannot be blank")
        return stripped


class UserRelationUpdate(BaseModel):
    status: UserStatus


class AdminModuleAccessItem(BaseModel):
    module_code: AdminModuleCode
    label: str
    description: str
    access_level: AdminModuleAccessLevel


class AdminModuleAccessListResponse(BaseModel):
    items: list[AdminModuleAccessItem]


class AdminModuleAccessUpdate(BaseModel):
    access_level: AdminModuleAccessLevel
