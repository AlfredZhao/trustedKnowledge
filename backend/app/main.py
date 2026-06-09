from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.blog_factory import router as blog_factory_router
from app.api.current_records import router as current_records_router
from app.api.english_materials import router as english_materials_router
from app.api.history_ask import router as history_ask_router
from app.api.history import router as history_router
from app.api.knowledge import router as knowledge_router
from app.api.todos import router as todos_router
from app.api.usage import router as usage_router
from app.core.config import settings
from app.db.oracle import close_pool, init_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
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
app.include_router(current_records_router, prefix="/api")
app.include_router(english_materials_router, prefix="/api")
app.include_router(history_ask_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(todos_router, prefix="/api")
app.include_router(usage_router, prefix="/api")


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
