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
            DB_TYPE_CLOB=object(),
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
                metaweblog_timeout_seconds=60,
                knowledge_processing_timeout_seconds=180,
                knowledge_processing_skill_char_budget=12000,
            )
        )

    if "fastapi" not in sys.modules:
        class HTTPException(Exception):
            def __init__(self, status_code: int, detail: str):
                super().__init__(detail)
                self.status_code = status_code
                self.detail = detail

        class APIRouter:
            def __init__(self, **_kwargs) -> None:
                pass

            def get(self, *_args, **_kwargs):
                return lambda endpoint: endpoint

            def post(self, *_args, **_kwargs):
                return lambda endpoint: endpoint

            def delete(self, *_args, **_kwargs):
                return lambda endpoint: endpoint

        fastapi_module = types.ModuleType("fastapi")
        fastapi_module.APIRouter = APIRouter
        fastapi_module.Depends = lambda dependency: dependency
        fastapi_module.Header = lambda default=None, **_kwargs: default
        fastapi_module.HTTPException = HTTPException
        fastapi_module.Query = lambda default=None, **_kwargs: default
        fastapi_module.status = types.SimpleNamespace(
            HTTP_202_ACCEPTED=202,
            HTTP_400_BAD_REQUEST=400,
            HTTP_401_UNAUTHORIZED=401,
            HTTP_403_FORBIDDEN=403,
            HTTP_404_NOT_FOUND=404,
            HTTP_409_CONFLICT=409,
            HTTP_503_SERVICE_UNAVAILABLE=503,
            HTTP_504_GATEWAY_TIMEOUT=504,
        )
        responses_module = types.ModuleType("fastapi.responses")
        responses_module.StreamingResponse = object
        sys.modules["fastapi"] = fastapi_module
        sys.modules["fastapi.responses"] = responses_module
