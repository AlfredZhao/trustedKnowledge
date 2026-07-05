import unittest
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.users import AuthContext, append_requested_username_clause, append_user_visibility_clause, has_admin_module_access


class PermissionClauseTests(unittest.IsolatedAsyncioTestCase):
    def test_append_user_visibility_clause_adds_visible_user_binds(self) -> None:
        clauses: list[str] = []
        params: dict[str, object] = {}
        context = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10, 11))

        append_user_visibility_clause(clauses, params, context, "record.user_id")

        self.assertEqual(clauses, ["record.user_id in (:visible_user_id_0, :visible_user_id_1)"])
        self.assertEqual(params, {"visible_user_id_0": 10, "visible_user_id_1": 11})

    def test_append_user_visibility_clause_blocks_empty_visibility(self) -> None:
        clauses: list[str] = []
        params: dict[str, object] = {}
        context = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=())

        append_user_visibility_clause(clauses, params, context, "record.user_id")

        self.assertEqual(clauses, ["1 = 0"])
        self.assertEqual(params, {})

    async def test_append_requested_username_clause_rejects_invisible_user(self) -> None:
        clauses: list[str] = []
        params: dict[str, object] = {}
        context = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))

        with patch("app.repositories.users.get_user_id_by_username", new=AsyncMock(return_value=12)):
            await append_requested_username_clause(object(), clauses, params, context, "bob", "record.user_id", param_name="target_user_id")

        self.assertEqual(clauses, ["1 = 0"])
        self.assertEqual(params, {})

    async def test_append_requested_username_clause_adds_allowed_user(self) -> None:
        clauses: list[str] = []
        params: dict[str, object] = {}
        context = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10, 12))

        with patch("app.repositories.users.get_user_id_by_username", new=AsyncMock(return_value=12)):
            await append_requested_username_clause(object(), clauses, params, context, "bob", "record.user_id", param_name="target_user_id")

        self.assertEqual(clauses, ["record.user_id = :target_user_id"])
        self.assertEqual(params, {"target_user_id": 12})

    async def test_has_admin_module_access_honors_module_settings(self) -> None:
        context = AuthContext(user_id=10, username="manager", is_admin=False, is_admin_role=True, visible_user_ids=(10,))

        with patch("app.repositories.users.list_visible_admin_modules", new=AsyncMock(return_value=["usage"])):
            self.assertTrue(await has_admin_module_access(context, "usage"))
            self.assertFalse(await has_admin_module_access(context, "aiCoding"))

    async def test_has_admin_module_access_allows_super_admin(self) -> None:
        context = AuthContext(user_id=None, username="admin", is_admin=True, is_admin_role=False, visible_user_ids=None)

        self.assertTrue(await has_admin_module_access(context, "usage"))


if __name__ == "__main__":
    unittest.main()
