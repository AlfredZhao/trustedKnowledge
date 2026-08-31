import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import knowledge
from app.repositories.users import AuthContext
from app.schemas.knowledge import KnowledgeCreate, KnowledgeUpdate
from tests.test_todos import FakeAcquire, FakeConnection, FakeCursor


class KnowledgeRepositoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

    async def test_create_knowledge_binds_answer_as_clob(self) -> None:
        cursor = FakeCursor(fetch_rows=[])
        connection = FakeConnection(cursor)
        expected = {"id": 42, "question": "title", "answer": "long answer", "source": None, "topic_tag": None, "blog_status": "未发布"}

        with (
            patch("app.repositories.knowledge.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.knowledge.get_knowledge_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await knowledge.create_knowledge(KnowledgeCreate(question="title", answer="long answer"), self.auth)

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertEqual(set(cursor.input_sizes or {}), {"answer"})
        self.assertIn("insert into ai_qa_lib", cursor.executed[0][0].lower())

    async def test_update_knowledge_locks_before_clob_binding_and_update(self) -> None:
        cursor = FakeCursor(fetch_rows=[(42,)])
        connection = FakeConnection(cursor)
        expected = {"id": 42, "question": "title", "answer": "updated", "source": None, "topic_tag": None, "blog_status": "未发布"}

        with (
            patch("app.repositories.knowledge.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.knowledge.get_knowledge_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await knowledge.update_knowledge(42, KnowledgeUpdate(answer="updated"), self.auth)

        self.assertEqual(result, expected)
        self.assertTrue(connection.committed)
        self.assertIn("for update wait 5", cursor.executed[0][0].lower())
        self.assertIn("update ai_qa_lib", cursor.executed[1][0].lower())
        self.assertEqual(set(cursor.input_size_history[0]), {"answer"})

    async def test_update_knowledge_without_answer_does_not_bind_clob(self) -> None:
        cursor = FakeCursor(fetch_rows=[(42,)])
        connection = FakeConnection(cursor)
        expected = {"id": 42, "question": "updated", "answer": "answer", "source": None, "topic_tag": None, "blog_status": "未发布"}

        with (
            patch("app.repositories.knowledge.acquire_connection", return_value=FakeAcquire(connection)),
            patch("app.repositories.knowledge.get_knowledge_by_id", new=AsyncMock(return_value=expected)),
        ):
            result = await knowledge.update_knowledge(42, KnowledgeUpdate(question="updated"), self.auth)

        self.assertEqual(result, expected)
        self.assertEqual(cursor.input_size_history, [])
        self.assertNotIn(":answer", cursor.executed[1][0].lower())


if __name__ == "__main__":
    unittest.main()
