import re
import unittest
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import history
from app.repositories.users import AuthContext


class FakeCursor:
    def __init__(self) -> None:
        self.executed: list[tuple[str, dict]] = []
        self._fetchone_rows = [(3,), (None, None)]

    async def execute(self, sql: str, params: dict | None = None) -> None:
        values = params or {}
        placeholders = set(re.findall(r":([A-Za-z_][A-Za-z0-9_]*)", sql))
        unexpected = set(values) - placeholders
        if unexpected:
            raise AssertionError(f"unexpected binds for SQL: {unexpected}")
        self.executed.append((sql, values))

    async def fetchone(self):
        return self._fetchone_rows.pop(0)

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


class HistoryRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_semantic_query_is_bound_only_to_vector_result_sql(self) -> None:
        cursor = FakeCursor()
        auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

        with patch("app.repositories.history.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))):
            await history.list_history(limit=20, offset=0, semantic_query="Oracle vector search", auth_context=auth)

        count_sql, count_params = cursor.executed[0]
        summary_sql, summary_params = cursor.executed[1]
        list_sql, list_params = cursor.executed[-1]
        self.assertIn("count(*)", count_sql.lower())
        self.assertNotIn("semantic_query", count_params)
        self.assertNotIn("semantic_query", summary_params)
        self.assertIn(":semantic_query", list_sql)
        self.assertEqual(list_params["semantic_query"], "Oracle vector search")


if __name__ == "__main__":
    unittest.main()
