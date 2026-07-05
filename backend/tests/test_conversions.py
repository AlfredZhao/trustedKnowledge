import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import blog_publish, conversions, current_records
from app.repositories.users import AuthContext


class FakeVar:
    def __init__(self, value: int):
        self.value = value

    def getvalue(self) -> list[int]:
        return [self.value]


class FakeCursor:
    def __init__(self, *, fetch_rows: list[tuple], generated_id: int = 99, rowcount: int = 1):
        self.fetch_rows = fetch_rows
        self.generated_id = generated_id
        self.rowcount = rowcount
        self.executed: list[tuple[str, dict | None]] = []

    async def execute(self, sql: str, params: dict | None = None) -> None:
        self.executed.append((sql, params))

    async def fetchone(self):
        return self.fetch_rows.pop(0) if self.fetch_rows else None

    def var(self, _type):
        return FakeVar(self.generated_id)


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


class ConversionRegressionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

    async def test_convert_knowledge_to_todo_moves_visible_record(self) -> None:
        cursor = FakeCursor(fetch_rows=[("question", "answer", "source", "tag", 10)], generated_id=77)
        connection = FakeConnection(cursor)
        expected = {"id": 77, "title": "question", "content": "answer", "source": "source", "topic_tag": "tag", "todo_status": "待处理"}

        with (
            patch("app.repositories.conversions.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.conversions._ensure_todo_table", new=AsyncMock()),
            patch("app.repositories.conversions.get_todo_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await conversions.convert_knowledge_to_todo(5, self.auth)

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertTrue(any("insert into ai_todo_items" in sql for sql, _ in cursor.executed))
        self.assertTrue(any("delete from ai_qa_lib" in sql for sql, _ in cursor.executed))

    async def test_convert_todo_to_knowledge_moves_visible_record(self) -> None:
        cursor = FakeCursor(fetch_rows=[("title", "content", "source", "tag", 10)], generated_id=88)
        connection = FakeConnection(cursor)
        expected = {"id": 88, "question": "title", "answer": "content", "source": "source", "topic_tag": "tag", "blog_status": "未发布"}

        with (
            patch("app.repositories.conversions.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.conversions._ensure_todo_table", new=AsyncMock()),
            patch("app.repositories.conversions.get_knowledge_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await conversions.convert_todo_to_knowledge(6, self.auth)

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertTrue(any("insert into ai_qa_lib" in sql for sql, _ in cursor.executed))
        self.assertTrue(any("delete from ai_todo_items" in sql for sql, _ in cursor.executed))

    async def test_prepend_todo_to_current_appends_current_record_content(self) -> None:
        cursor = FakeCursor(fetch_rows=[(31, "学习", "W1", "D1", "existing content", "alice", 1)])
        connection = FakeConnection(cursor)
        expected = {"id": 31, "content": "updated"}

        with (
            patch("app.repositories.current_records.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.current_records.get_current_record", new=AsyncMock(return_value=expected)),
        ):
            result = await current_records.prepend_todo_to_current_content(
                username="alice",
                current_type="学习",
                week="W1",
                day="D1",
                replace_existing_content=False,
                todo_title="Todo title",
                todo_content="Todo content",
                auth_context=self.auth,
            )

        update_params = cursor.executed[-1][1]
        self.assertEqual(result, expected)
        self.assertIn("Todo title", update_params["content"])
        self.assertIn("Todo content", update_params["content"])
        self.assertIn("existing content", update_params["content"])

    async def test_mark_factory_item_published_updates_knowledge_and_factory_status(self) -> None:
        cursor = FakeCursor(fetch_rows=[])

        await blog_publish._mark_factory_item_published(cursor, knowledge_id=42, user_id=10)

        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("set blog_status = '已发布'", cursor.executed[0][0])
        self.assertIn("factory_status = '已发布'", cursor.executed[1][0])
        self.assertEqual(cursor.executed[0][1], {"knowledge_id": 42, "user_id": 10})


if __name__ == "__main__":
    unittest.main()
