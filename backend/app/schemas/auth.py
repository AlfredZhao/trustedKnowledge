from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class LoginResponse(BaseModel):
    api_key: str
    username: str
    is_admin: bool
    is_admin_role: bool
    visible_users: list[str] = []
    visible_admin_modules: list[str] = []


class AuthConfigResponse(BaseModel):
    wechat_enabled: bool


class AuthUserResponse(BaseModel):
    username: str
    is_admin: bool
    is_admin_role: bool
    visible_users: list[str] = []
    visible_admin_modules: list[str] = []


class WeChatLoginStartResponse(BaseModel):
    authorization_url: str
