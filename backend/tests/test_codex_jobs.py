import asyncio
import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.api import codex
from app.repositories.users import AuthContext


class CodexJobCancellationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))
        self.job = codex.CodexJobState(job_id="job-1", owner_username="alice", prompt="test", slot_reserved=True)
        codex._codex_jobs[self.job.job_id] = self.job
        codex._codex_active_run_counts["alice"] = 1

    def tearDown(self) -> None:
        codex._codex_jobs.clear()
        codex._codex_job_tasks.clear()
        codex._codex_job_processes.clear()
        codex._codex_active_run_counts.clear()

    async def test_cancel_running_job_marks_it_failed_and_releases_slot(self) -> None:
        async def wait_for_cancellation() -> None:
            await asyncio.Event().wait()

        task = asyncio.create_task(wait_for_cancellation())
        codex._codex_job_tasks[self.job.job_id] = task

        snapshot = await codex.cancel_codex_job(self.job.job_id, self.auth)

        self.assertTrue(task.cancelled())
        self.assertEqual(snapshot.status, "cancelled")
        self.assertEqual(snapshot.error_message, "Codex task was terminated by the user.")
        self.assertIsNotNone(snapshot.completed_at)
        self.assertFalse(self.job.slot_reserved)
        self.assertNotIn("alice", codex._codex_active_run_counts)


if __name__ == "__main__":
    unittest.main()
