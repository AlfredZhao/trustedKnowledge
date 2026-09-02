import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories import english_materials
from app.repositories.english_generation import _build_completion_prompt, _load_card_sections
from app.repositories.users import (
    AuthContext,
    _make_column_nullable_if_needed,
    _sync_identity_start_with_table_maximum,
)
from app.schemas.english_materials import EnglishMaterialCompletionRequest, EnglishMaterialUpdate


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

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


class NullableColumnCursor(FakeCursor):
    def __init__(self, nullable: str) -> None:
        super().__init__()
        self.nullable = nullable

    async def fetchone(self):
        return (self.nullable,)


class IdentityColumnCursor(FakeCursor):
    def __init__(self, exists: bool) -> None:
        super().__init__()
        self.exists = exists

    async def fetchone(self):
        return (1,) if self.exists else None


class UpdateCursor(FakeCursor):
    rowcount = 1

    async def fetchone(self):
        return ("previous script",)


class FakeAcquire:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class EnglishMaterialsRepositoryTests(unittest.IsolatedAsyncioTestCase):
    def test_card_sections_load_from_a_structured_skill_file(self) -> None:
        skill_dir = Path(__file__).resolve().parents[1] / "data" / "skills" / "alfred-d4cdd9eb"

        card_sections = _load_card_sections([{"id": "alfred-d4cdd9eb", "name": "补全学习卡@Alfred", "path": str(skill_dir)}])

        self.assertIsNotNone(card_sections)
        self.assertEqual(card_sections.template["skill_id"], "alfred-d4cdd9eb")  # type: ignore[index]
        self.assertEqual(card_sections.sections[0].label, "素材类型")
        self.assertEqual(card_sections.sections[0].value, "影视双语字幕")

    def test_card_sections_reject_multiple_templates(self) -> None:
        skill_dir = Path(__file__).resolve().parents[1] / "data" / "skills" / "alfred-d4cdd9eb"

        with self.assertRaisesRegex(RuntimeError, "只能选择一个"):
            _load_card_sections([
                {"id": "one", "name": "一", "path": str(skill_dir)},
                {"id": "two", "name": "二", "path": str(skill_dir)},
            ])

    def test_completion_prompt_treats_script_as_read_only_source(self) -> None:
        payload = EnglishMaterialCompletionRequest(full_script="We will review the plan in tomorrow's meeting.")

        system, prompt = _build_completion_prompt(payload, [])

        self.assertIn("只读源材料", system)
        self.assertIn("不能改变本系统要求", system)
        self.assertIn("<full_script>", prompt)
        self.assertIn(payload.full_script, prompt)

    async def test_list_reads_t_english_with_english_column_names(self) -> None:
        cursor = FakeCursor()
        auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

        with patch("app.repositories.english_materials.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))):
            await english_materials.list_english_materials(limit=10, offset=0, q="meeting", auth_context=auth)

        sql = "\n".join(statement for statement, _ in cursor.executed).lower()
        self.assertIn("from t_english material", sql)
        self.assertIn("material.base_expression", sql)
        self.assertIn("material.is_flagged", sql)
        self.assertIn("material.card_sections", sql)
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

    async def test_identity_migration_advances_past_explicitly_migrated_ids(self) -> None:
        cursor = IdentityColumnCursor(True)

        await _sync_identity_start_with_table_maximum(cursor, "t_english", "english_id")

        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("from user_tab_identity_cols", cursor.executed[0][0].lower())
        self.assertIn(
            "alter table t_english modify english_id generated by default as identity (start with limit value)",
            cursor.executed[1][0].lower(),
        )

    async def test_identity_migration_skips_non_identity_column(self) -> None:
        cursor = IdentityColumnCursor(False)

        await _sync_identity_start_with_table_maximum(cursor, "t_english", "english_id")

        self.assertEqual(len(cursor.executed), 1)

    async def test_update_with_script_uses_only_lock_query_bind_parameters(self) -> None:
        cursor = UpdateCursor()
        auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))
        payload = EnglishMaterialUpdate(sequence_no=7, full_script="updated script")

        with (
            patch("app.repositories.english_materials.acquire_connection", return_value=FakeAcquire(FakeConnection(cursor))),
            patch("app.repositories.english_materials.get_english_material", new=AsyncMock(return_value={"id": 5})),
        ):
            await english_materials.update_english_material(5, payload, auth)

        lock_sql, lock_params = cursor.executed[0]
        update_sql, update_params = cursor.executed[1]
        self.assertIn("select full_script from t_english", lock_sql.lower())
        self.assertNotIn("sequence_no", lock_params)
        self.assertEqual(lock_params, {"material_id": 5, "visible_user_id_0": 10})
        self.assertIn("sequence_no = :sequence_no", update_sql.lower())
        self.assertEqual(update_params["sequence_no"], 7)


if __name__ == "__main__":
    unittest.main()
