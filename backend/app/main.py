from contextlib import asynccontextmanager

import oracledb
from fastapi import FastAPI
from fastapi import HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.blog_factory import router as blog_factory_router
from app.api.codex import router as codex_router
from app.api.current_records import router as current_records_router
from app.api.english_materials import router as english_materials_router
from app.api.history_ask import router as history_ask_router
from app.api.history_ask_quick_questions import router as history_ask_quick_questions_router
from app.api.history_ontology import router as history_ontology_router
from app.api.history import router as history_router
from app.api.knowledge import router as knowledge_router
from app.api.media import router as media_router
from app.api.personal_secrets import router as personal_secrets_router
from app.api.skills import router as skills_router
from app.api.system import router as system_router
from app.api.todos import router as todos_router
from app.api.usage import router as usage_router
from app.api.users import router as users_router
from app.core.config import settings
from app.db.oracle import acquire_connection, close_pool, init_pool
from app.repositories.users import ensure_user_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await ensure_user_schema()
    try:
        yield
    finally:
        await close_pool()


app = FastAPI(
    title="Trusted Knowledge API",
    version="0.1.0",
    description="Async FastAPI backend for Oracle-backed trusted knowledge capture.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(blog_factory_router, prefix="/api")
app.include_router(codex_router, prefix="/api")
app.include_router(current_records_router, prefix="/api")
app.include_router(english_materials_router, prefix="/api")
app.include_router(history_ask_router, prefix="/api")
app.include_router(history_ask_quick_questions_router, prefix="/api")
app.include_router(history_ontology_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(personal_secrets_router, prefix="/api")
app.include_router(skills_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(todos_router, prefix="/api")
app.include_router(usage_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", tags=["system"])
async def database_health_check() -> dict[str, str]:
    try:
        async with acquire_connection() as connection:
            cursor = connection.cursor()
            await cursor.execute("select 1 from dual")
            await cursor.fetchone()
    except (RuntimeError, oracledb.Error) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Oracle database check failed: {exc}",
        ) from exc
    return {"status": "ok", "database": "ok"}
