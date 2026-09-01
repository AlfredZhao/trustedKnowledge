import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from fastapi import APIRouter, status

# The lightweight FastAPI fallback used by isolated repository tests only
# defines the status values older tests needed.
status.HTTP_202_ACCEPTED = 202
status.HTTP_201_CREATED = 201
status.HTTP_204_NO_CONTENT = 204
status.HTTP_404_NOT_FOUND = 404
if not hasattr(APIRouter, "delete"):
    APIRouter.delete = lambda self, *_args, **_kwargs: lambda endpoint: endpoint
if not hasattr(APIRouter, "patch"):
    APIRouter.patch = lambda self, *_args, **_kwargs: lambda endpoint: endpoint

from app.api import english_materials
from app.schemas.english_materials import EnglishMaterialCompletionRequest, EnglishMaterialCompletionResult


class EnglishMaterialCompletionJobTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        english_materials._completion_jobs.clear()
        english_materials._completion_job_tasks.clear()
        self.payload = EnglishMaterialCompletionRequest(full_script="We will review the plan in tomorrow's meeting.")
        self.auth = SimpleNamespace(username="learner")

    async def asyncTearDown(self) -> None:
        for task in list(english_materials._completion_job_tasks.values()):
            task.cancel()
        await asyncio.gather(*english_materials._completion_job_tasks.values(), return_exceptions=True)
        english_materials._completion_jobs.clear()
        english_materials._completion_job_tasks.clear()

    async def test_duplicate_running_completion_returns_the_same_job(self) -> None:
        started = asyncio.Event()
        release = asyncio.Event()

        async def delayed_completion(*_args, **_kwargs):
            started.set()
            await release.wait()
            return EnglishMaterialCompletionResult(
                title="Meeting preparation",
                base_expression="review the plan",
                professional_sentence="We will review the plan in tomorrow's meeting.",
                chinese_translation="我们会在明天的会议上审阅计划。",
            )

        with patch.object(english_materials, "complete_english_material", delayed_completion):
            first = await english_materials.start_english_material_completion_job(self.payload, self.auth)
            await started.wait()
            second = await english_materials.start_english_material_completion_job(self.payload, self.auth)
            self.assertEqual(first.job_id, second.job_id)
            self.assertEqual(second.status, "running")
            release.set()
            await english_materials._completion_job_tasks[first.job_id]

    async def test_cancellation_marks_job_cancelled(self) -> None:
        started = asyncio.Event()

        async def delayed_completion(*_args, **_kwargs):
            started.set()
            await asyncio.Event().wait()

        with patch.object(english_materials, "complete_english_material", delayed_completion):
            snapshot = await english_materials.start_english_material_completion_job(self.payload, self.auth)
            await started.wait()
            cancelled = await english_materials.cancel_english_material_completion_job(snapshot.job_id, self.auth)

        self.assertEqual(cancelled.status, "cancelled")
        self.assertEqual(cancelled.error_message, "AI 补全已取消。")

    async def test_completed_job_exposes_completion_result(self) -> None:
        expected = EnglishMaterialCompletionResult(
            title="Meeting preparation",
            base_expression="review the plan",
            professional_sentence="We will review the plan in tomorrow's meeting.",
            chinese_translation="我们会在明天的会议上审阅计划。",
        )

        async def completed_completion(*_args, **_kwargs):
            return expected

        with patch.object(english_materials, "complete_english_material", completed_completion):
            snapshot = await english_materials.start_english_material_completion_job(self.payload, self.auth)
            await english_materials._completion_job_tasks[snapshot.job_id]
            current = await english_materials.get_english_material_completion_job(snapshot.job_id, self.auth)

        self.assertEqual(current.status, "completed")
        self.assertEqual(current.result, expected)
        self.assertIsNotNone(current.completed_at)


if __name__ == "__main__":
    unittest.main()
