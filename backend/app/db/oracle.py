from __future__ import annotations

import inspect
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import oracledb

from app.core.config import settings


_pool: oracledb.AsyncConnectionPool | None = None


async def init_pool() -> None:
    global _pool
    if _pool is not None:
        return

    oracledb.defaults.fetch_lobs = False
    pool = oracledb.create_pool_async(
        user=settings.db_user,
        password=settings.db_password,
        dsn=settings.db_dsn,
        min=settings.db_pool_min,
        max=settings.db_pool_max,
        increment=settings.db_pool_increment,
        ping_interval=settings.db_pool_ping_interval,
        timeout=settings.db_pool_timeout,
        max_lifetime_session=settings.db_pool_max_lifetime_session,
    )
    _pool = await pool if inspect.isawaitable(pool) else pool


async def close_pool() -> None:
    global _pool
    if _pool is None:
        return

    close_result = _pool.close()
    if inspect.isawaitable(close_result):
        await close_result
    _pool = None


def get_pool() -> oracledb.AsyncConnectionPool:
    if _pool is None:
        raise RuntimeError("Oracle connection pool has not been initialized")
    return _pool


@asynccontextmanager
async def acquire_connection() -> AsyncGenerator[oracledb.AsyncConnection, None]:
    pool = get_pool()
    async with pool.acquire() as connection:
        yield connection
