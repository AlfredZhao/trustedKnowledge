from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_user: str = Field(..., validation_alias="TRUSTED_KNOWLEDGE_DB_USER")
    db_password: str = Field(..., validation_alias="TRUSTED_KNOWLEDGE_DB_PASSWORD")
    db_dsn: str = Field(..., validation_alias="TRUSTED_KNOWLEDGE_DB_DSN")
    db_pool_min: int = Field(1, validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_MIN", ge=1)
    db_pool_max: int = Field(4, validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_MAX", ge=1)
    db_pool_increment: int = Field(1, validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_INCREMENT", ge=1)
    db_pool_ping_interval: int = Field(60, validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_PING_INTERVAL", ge=0)
    db_pool_timeout: int = Field(300, validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_TIMEOUT", ge=0)
    db_pool_max_lifetime_session: int = Field(
        3600,
        validation_alias="TRUSTED_KNOWLEDGE_DB_POOL_MAX_LIFETIME_SESSION",
        ge=0,
    )
    cors_origins: str = Field(
        "http://localhost:8021,http://127.0.0.1:8021",
        validation_alias="TRUSTED_KNOWLEDGE_CORS_ORIGINS",
    )
    admin_username: str = Field("admin", validation_alias="TRUSTED_KNOWLEDGE_ADMIN_USERNAME")
    admin_password: str = Field(..., validation_alias="TRUSTED_KNOWLEDGE_ADMIN_PASSWORD")
    api_key: str = Field(..., validation_alias="TRUSTED_KNOWLEDGE_API_KEY")
    frontend_base_url: str = Field("http://localhost:8021", validation_alias="TRUSTED_KNOWLEDGE_FRONTEND_BASE_URL")
    wechat_app_id: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_WECHAT_APP_ID")
    wechat_app_secret: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_WECHAT_APP_SECRET")
    wechat_redirect_uri: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI")
    wechat_allowed_openids: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_OPENIDS")
    wechat_allowed_unionids: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_UNIONIDS")
    allow_web_restart: bool = Field(False, validation_alias="TRUSTED_KNOWLEDGE_ALLOW_WEB_RESTART")
    allow_web_codex: bool = Field(False, validation_alias="TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX")
    codex_bin: str = Field("codex", validation_alias="TRUSTED_KNOWLEDGE_CODEX_BIN")
    web_codex_user_concurrency: int = Field(
        1,
        validation_alias="TRUSTED_KNOWLEDGE_WEB_CODEX_USER_CONCURRENCY",
        ge=1,
    )
    history_ask_llm_api_key: str = Field("", validation_alias="TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY")
    skill_storage_dir: str = Field("data/skills", validation_alias="TRUSTED_KNOWLEDGE_SKILL_STORAGE_DIR")
    skill_max_zip_mb: int = Field(20, validation_alias="TRUSTED_KNOWLEDGE_SKILL_MAX_ZIP_MB", ge=1)
    media_storage_dir: str = Field("data/media", validation_alias="TRUSTED_KNOWLEDGE_MEDIA_STORAGE_DIR")
    media_max_image_mb: int = Field(8, validation_alias="TRUSTED_KNOWLEDGE_MEDIA_MAX_IMAGE_MB", ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def wechat_enabled(self) -> bool:
        return bool(self.wechat_app_id and self.wechat_app_secret and self.wechat_redirect_uri)

    @property
    def wechat_allowed_openid_set(self) -> set[str]:
        return {item.strip() for item in self.wechat_allowed_openids.split(",") if item.strip()}

    @property
    def wechat_allowed_unionid_set(self) -> set[str]:
        return {item.strip() for item in self.wechat_allowed_unionids.split(",") if item.strip()}

    @property
    def skill_storage_path(self) -> Path:
        path = Path(self.skill_storage_dir).expanduser()
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[2] / path

    @property
    def skill_max_zip_size(self) -> int:
        return self.skill_max_zip_mb * 1024 * 1024

    @property
    def media_storage_path(self) -> Path:
        path = Path(self.media_storage_dir).expanduser()
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[2] / path

    @property
    def media_max_image_size(self) -> int:
        return self.media_max_image_mb * 1024 * 1024

    @field_validator("db_pool_max")
    @classmethod
    def validate_pool_size(cls, value: int, info) -> int:
        pool_min = info.data.get("db_pool_min", 1)
        if value < pool_min:
            raise ValueError("TRUSTED_KNOWLEDGE_DB_POOL_MAX must be >= DB_POOL_MIN")
        return value

    @field_validator("admin_username", "admin_password", "api_key")
    @classmethod
    def validate_auth_secret(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Authentication settings cannot be blank")
        return stripped


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
