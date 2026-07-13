import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import todos
from app.repositories.users import AuthContext
from app.schemas.todos import TodoUpdate


class FakeCursor:
    def __init__(self, *, fetch_rows: list[tuple], rowcount: int = 1):
        self.fetch_rows = fetch_rows
        self.rowcount = rowcount
        self.executed: list[tuple[str, dict | None]] = []
        self.input_sizes: dict | None = None

    async def execute(self, sql: str, params: dict | None = None) -> None:
        self.executed.append((sql, params))

    async def fetchone(self):
        return self.fetch_rows.pop(0) if self.fetch_rows else None

    def setinputsizes(self, **kwargs) -> None:
        self.input_sizes = kwargs

    def var(self, _type):
        class FakeVar:
            def getvalue(self) -> list[int]:
                return [42]

        return FakeVar()


class FakeConnection:
    def __init__(self, cursor: FakeCursor):
        self._cursor = cursor
        self.committed = False
        self.rolled_back = False

    def cursor(self) -> FakeCursor:
        return self._cursor

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True


class FakeAcquire:
    def __init__(self, connection: FakeConnection):
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class TodoRepositoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

    async def test_update_todo_locks_visible_row_before_update(self) -> None:
        cursor = FakeCursor(fetch_rows=[(42,)])
        connection = FakeConnection(cursor)
        expected = {"id": 42, "title": "title", "content": "content", "source": None, "topic_tag": None, "todo_status": "处理中"}

        with (
            patch("app.repositories.todos.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.todos._ensure_todo_table", new=AsyncMock()),
            patch("app.repositories.todos.get_todo_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await todos.update_todo(42, TodoUpdate(title="title", content="content"), self.auth)

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertIsNotNone(cursor.input_sizes)
        self.assertIn("content", cursor.input_sizes)
        self.assertIn("for update wait 5", cursor.executed[0][0].lower())
        self.assertIn("update ai_todo_items", cursor.executed[1][0].lower())

    async def test_create_todo_binds_text_fields_as_clobs(self) -> None:
        cursor = FakeCursor(fetch_rows=[])
        connection = FakeConnection(cursor)
        expected = {"id": 42, "title": "title", "content": "content", "source": None, "topic_tag": None, "todo_status": "处理中"}

        with (
            patch("app.repositories.todos.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.todos._ensure_todo_table", new=AsyncMock()),
            patch("app.repositories.todos.get_todo_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await todos.create_todo(
                todos.TodoCreate(title="title", content="INSERT INTO table_name SELECT * FROM source_table", todo_status="处理中"),
                self.auth,
            )

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertIsNotNone(cursor.input_sizes)
        self.assertIn("title", cursor.input_sizes)
        self.assertIn("content", cursor.input_sizes)
        self.assertIn("insert into ai_todo_items", cursor.executed[0][0].lower())

    async def test_update_todo_rolls_back_when_visible_row_missing(self) -> None:
        cursor = FakeCursor(fetch_rows=[])
        connection = FakeConnection(cursor)

        with (
            patch("app.repositories.todos.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.todos._ensure_todo_table", new=AsyncMock()),
        ):
            result = await todos.update_todo(42, TodoUpdate(title="title", content="content"), self.auth)

        self.assertIsNone(result)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertEqual(len(cursor.executed), 1)


if __name__ == "__main__":
    unittest.main()
