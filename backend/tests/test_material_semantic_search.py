import re
import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import blog_factory, english_materials
from app.repositories.users import AuthContext


class FakeCursor:
    def __init__(self) -> None:
        self.executed: list[tuple[str, dict]] = []
        self._fetchone_rows = [(0,)]

    async def execute(self, sql: str, params: dict | None = None) -> None:
        values = params or {}
        placeholders = set(re.findall(r":([A-Za-z_][A-Za-z0-9_]*)", sql))
        unexpected = set(values) - placeholders
        if unexpected:
            raise AssertionError(f"unexpected binds for SQL: {unexpected}")
        self.executed.append((sql, values))

    async def fetchone(self):
        return self._fetchone_rows.pop(0) if self._fetchone_rows else None

    async def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    def cursor(self) -> FakeCursor:
        return self._cursor


class FakeAcquire:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class MaterialSemanticSearchTests(unittest.IsolatedAsyncioTestCase):
    auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

    async def test_english_semantic_bind_is_used_only_by_list_sql(self) -> None:
        cursor = FakeCursor()
        with patch("app.repositories.english_materials.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))):
            await english_materials.list_english_materials(limit=20, offset=0, semantic_query="meeting update", auth_context=self.auth)

        count_sql, count_params = cursor.executed[0]
        list_sql, list_params = cursor.executed[1]
        self.assertIn("count(*)", count_sql.lower())
        self.assertNotIn("semantic_query", count_params)
        self.assertIn(":semantic_query", list_sql)
        self.assertEqual(list_params["semantic_query"], "meeting update")

    async def test_blog_semantic_bind_is_used_only_by_list_sql(self) -> None:
        cursor = FakeCursor()
        with (
            patch("app.repositories.blog_factory.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))),
            patch("app.repositories.blog_factory._ensure_blog_factory_table", new=AsyncMock()),
        ):
            await blog_factory.list_blog_factory_items(limit=20, offset=0, semantic_query="Oracle APEX", auth_context=self.auth)

        count_sql, count_params = cursor.executed[0]
        list_sql, list_params = cursor.executed[1]
        self.assertIn("count(*)", count_sql.lower())
        self.assertNotIn("semantic_query", count_params)
        self.assertIn(":semantic_query", list_sql)
        self.assertEqual(list_params["semantic_query"], "Oracle APEX")


if __name__ == "__main__":
    unittest.main()
