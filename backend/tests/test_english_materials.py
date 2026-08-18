import unittest
from pathlib import Path
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import english_materials
from app.repositories.users import AuthContext, _make_column_nullable_if_needed


class FakeCursor:
    def __init__(self) -> None:
        self.executed: list[tuple[str, dict]] = []

    async def execute(self, sql: str, params: dict | None = None) -> None:
        self.executed.append((sql, params or {}))

    async def fetchone(self):
        return (0,)

    async def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    def cursor(self) -> FakeCursor:
        return self._cursor


class NullableColumnCursor(FakeCursor):
    def __init__(self, nullable: str) -> None:
        super().__init__()
        self.nullable = nullable

    async def fetchone(self):
        return (self.nullable,)


class FakeAcquire:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class EnglishMaterialsRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_list_reads_t_english_with_english_column_names(self) -> None:
        cursor = FakeCursor()
        auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

        with patch("app.repositories.english_materials.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))):
            await english_materials.list_english_materials(limit=10, offset=0, q="meeting", auth_context=auth)

        sql = "\n".join(statement for statement, _ in cursor.executed).lower()
        self.assertIn("from t_english material", sql)
        self.assertIn("material.base_expression", sql)
        self.assertIn("material.is_flagged", sql)
        self.assertNotIn("t_douyin_details", sql)
        self.assertNotIn('material."基础表达"', sql)

    def test_startup_schema_has_no_legacy_english_table_reference(self) -> None:
        users_repository = Path(__file__).resolve().parents[1] / "app" / "repositories" / "users.py"

        self.assertNotIn("t_douyin_details", users_repository.read_text(encoding="utf-8").lower())

    async def test_nullable_column_migration_skips_already_nullable_column(self) -> None:
        cursor = NullableColumnCursor("Y")

        await _make_column_nullable_if_needed(cursor, "t_english", "base_expression")

        self.assertEqual(len(cursor.executed), 1)
        self.assertIn("from user_tab_columns", cursor.executed[0][0].lower())

    async def test_nullable_column_migration_relaxes_not_null_column(self) -> None:
        cursor = NullableColumnCursor("N")

        await _make_column_nullable_if_needed(cursor, "t_english", "base_expression")

        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("alter table t_english modify (base_expression null)", cursor.executed[1][0].lower())


if __name__ == "__main__":
    unittest.main()
