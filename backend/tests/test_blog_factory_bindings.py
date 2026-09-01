import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import blog_factory
from app.repositories.users import AuthContext
from app.schemas.blog_factory import BlogFactoryUpdate


class FakeCursor:
    rowcount = 1

    def __init__(self) -> None:
        self.executed: list[tuple[str, dict]] = []

    async def execute(self, sql: str, params: dict | None = None) -> None:
        self.executed.append((sql, params or {}))

    async def fetchone(self):
        return ("previous task",)


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    def cursor(self) -> FakeCursor:
        return self._cursor

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


class FakeAcquire:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class BlogFactoryBindingTests(unittest.IsolatedAsyncioTestCase):
    async def test_update_with_task_content_uses_only_lock_query_bind_parameters(self) -> None:
        cursor = FakeCursor()
        auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))
        payload = BlogFactoryUpdate(
            task_content="updated task",
            question_snapshot="updated question",
            cover_prompt_snapshot="已确认保存的生图提示词",
        )

        with (
            patch("app.repositories.blog_factory.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))),
            patch("app.repositories.blog_factory._ensure_blog_factory_table", new=AsyncMock()),
            patch("app.repositories.blog_factory.get_blog_factory_item", new=AsyncMock(return_value={"id": 5})),
        ):
            await blog_factory.update_blog_factory_item(5, payload, auth)

        lock_sql, lock_params = cursor.executed[0]
        update_sql, update_params = cursor.executed[1]
        self.assertIn("select task_content from ai_blog_factory", lock_sql.lower())
        self.assertEqual(lock_params, {"item_id": 5, "visible_user_id_0": 10})
        self.assertIn("task_content = :task_content", update_sql.lower())
        self.assertIn("question_snapshot = :question_snapshot", update_sql.lower())
        self.assertIn("cover_prompt_snapshot = :cover_prompt_snapshot", update_sql.lower())
        self.assertEqual(update_params["task_content"], "updated task")
        self.assertEqual(update_params["question_snapshot"], "updated question")
        self.assertEqual(update_params["cover_prompt_snapshot"], "已确认保存的生图提示词")


if __name__ == "__main__":
    unittest.main()
