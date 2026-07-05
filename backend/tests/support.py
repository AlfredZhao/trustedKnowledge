import os
import sys
import types


def prepare_backend_imports() -> None:
    os.environ.setdefault("TRUSTED_KNOWLEDGE_DB_USER", "test_user")
    os.environ.setdefault("TRUSTED_KNOWLEDGE_DB_PASSWORD", "test_password")
    os.environ.setdefault("TRUSTED_KNOWLEDGE_DB_DSN", "localhost/test")
    os.environ.setdefault("TRUSTED_KNOWLEDGE_ADMIN_PASSWORD", "test_admin_password")
    os.environ.setdefault("TRUSTED_KNOWLEDGE_API_KEY", "test_api_key")

    if "oracledb" not in sys.modules:
        sys.modules["oracledb"] = types.SimpleNamespace(
            NUMBER=object(),
            Error=Exception,
            AsyncConnection=object,
            AsyncConnectionPool=object,
            defaults=types.SimpleNamespace(fetch_lobs=False),
            create_pool_async=lambda **_kwargs: None,
        )

    if "app.core.config" not in sys.modules:
        sys.modules["app.core.config"] = types.SimpleNamespace(
            settings=types.SimpleNamespace(
                admin_username="admin",
                admin_password="test_admin_password",
                api_key="test_api_key",
                db_user="test_user",
                db_password="test_password",
                db_dsn="localhost/test",
                db_pool_min=1,
                db_pool_max=1,
                db_pool_increment=1,
                db_pool_ping_interval=60,
                db_pool_timeout=300,
                db_pool_max_lifetime_session=3600,
                history_ask_llm_api_key="",
            )
        )

    if "fastapi" not in sys.modules:
        class HTTPException(Exception):
            def __init__(self, status_code: int, detail: str):
                super().__init__(detail)
                self.status_code = status_code
                self.detail = detail

        sys.modules["fastapi"] = types.SimpleNamespace(
            HTTPException=HTTPException,
            status=types.SimpleNamespace(HTTP_403_FORBIDDEN=403),
        )
