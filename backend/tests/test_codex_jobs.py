import asyncio
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.api import codex
from app.repositories import skills
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

    def test_approval_event_is_exposed_as_noninteractive_warning(self) -> None:
        summary = codex._summarize_codex_event('{"type":"approval_requested"}', "stdout")

        self.assertIn("等待审批", summary)
        self.assertIn("无法响应", summary)

    def test_final_output_jobs_use_the_short_knowledge_processing_timeout(self) -> None:
        processing_job = codex.CodexJobState(job_id="job-final", owner_username="alice", prompt="test", output_mode="final")
        coding_job = codex.CodexJobState(job_id="job-full", owner_username="alice", prompt="test", output_mode="full")

        self.assertEqual(codex._job_timeout_seconds(processing_job), codex.settings.knowledge_processing_timeout_seconds)
        self.assertEqual(codex._job_timeout_seconds(coding_job), codex.CODEX_TIMEOUT_SECONDS)

    async def test_other_model_processing_job_stops_at_the_job_timeout(self) -> None:
        self.job.output_mode = "final"

        async def never_returns(**_: object) -> str:
            await asyncio.Event().wait()
            return ""

        with (
            patch.object(codex, "_get_enabled_history_ask_llm_config", new=AsyncMock(return_value={"model_name": "test"})),
            patch.object(codex, "_build_history_ask_llm_prompt", return_value=("prompt", "system")),
            patch.object(codex, "_call_history_ask_llm", side_effect=never_returns),
            patch.object(codex, "_job_timeout_seconds", return_value=0.01),
        ):
            await codex._run_history_ask_llm_job(self.job, self.auth)

        self.assertEqual(self.job.status, "failed")
        self.assertIn("任务已停止", self.job.error_message or "")

    def test_processing_skill_content_uses_a_shared_character_budget(self) -> None:
        details = iter(
            [
                {"can_use": True, "id": "first", "name": "First", "description": "", "skill_markdown": "abcdef"},
                {"can_use": True, "id": "second", "name": "Second", "description": "", "skill_markdown": "ghijkl"},
            ]
        )
        with (
            patch.object(skills, "_skill_dir", return_value=Path("/tmp/skill")),
            patch.object(skills, "get_skill", side_effect=lambda *_: next(details)),
        ):
            selected = skills.get_prompt_skills(["first", "second"], self.auth, total_content_char_budget=8)

        self.assertEqual([item["content"] for item in selected], ["abcdef", "gh"])
        self.assertEqual(sum(len(item["content"]) for item in selected), 8)


if __name__ == "__main__":
    unittest.main()
