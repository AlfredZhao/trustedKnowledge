import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from fastapi import APIRouter, status

status.HTTP_201_CREATED = 201
status.HTTP_202_ACCEPTED = 202
status.HTTP_204_NO_CONTENT = 204
if not hasattr(APIRouter, "patch"):
    APIRouter.patch = lambda self, *_args, **_kwargs: lambda endpoint: endpoint

from app.api import blog_factory
from app.schemas.blog_factory import BlogFactoryEnhancementRequest, BlogFactoryEnhancementResult


class BlogEnhancementJobTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        blog_factory._enhancement_jobs.clear()
        blog_factory._enhancement_job_tasks.clear()
        self.payload = BlogFactoryEnhancementRequest(task_content="# Draft\n\nContent to enhance.")
        self.auth = SimpleNamespace(username="enhancer")

    async def asyncTearDown(self) -> None:
        for task in list(blog_factory._enhancement_job_tasks.values()):
            task.cancel()
        await asyncio.gather(*blog_factory._enhancement_job_tasks.values(), return_exceptions=True)
        blog_factory._enhancement_jobs.clear()
        blog_factory._enhancement_job_tasks.clear()

    async def test_duplicate_running_enhancement_returns_the_same_job(self) -> None:
        started = asyncio.Event()
        release = asyncio.Event()

        async def delayed_enhancement(*_args, **_kwargs):
            started.set()
            await release.wait()
            return BlogFactoryEnhancementResult(content="# Enhanced")

        with patch.object(blog_factory, "enhance_blog_factory_content", delayed_enhancement):
            first = await blog_factory.start_blog_factory_enhancement_job(self.payload, self.auth)
            await started.wait()
            second = await blog_factory.start_blog_factory_enhancement_job(self.payload, self.auth)
            self.assertEqual(first.job_id, second.job_id)
            self.assertEqual(second.status, "running")
            release.set()
            await blog_factory._enhancement_job_tasks[first.job_id]

    async def test_completed_job_exposes_enhanced_content(self) -> None:
        expected = BlogFactoryEnhancementResult(content="# Enhanced")

        async def completed_enhancement(*_args, **_kwargs):
            return expected

        with patch.object(blog_factory, "enhance_blog_factory_content", completed_enhancement):
            snapshot = await blog_factory.start_blog_factory_enhancement_job(self.payload, self.auth)
            await blog_factory._enhancement_job_tasks[snapshot.job_id]
            current = await blog_factory.get_blog_factory_enhancement_job(snapshot.job_id, self.auth)

        self.assertEqual(current.status, "completed")
        self.assertEqual(current.result, expected)
        self.assertIsNotNone(current.completed_at)

    async def test_cancellation_marks_job_cancelled(self) -> None:
        started = asyncio.Event()

        async def delayed_enhancement(*_args, **_kwargs):
            started.set()
            await asyncio.Event().wait()

        with patch.object(blog_factory, "enhance_blog_factory_content", delayed_enhancement):
            snapshot = await blog_factory.start_blog_factory_enhancement_job(self.payload, self.auth)
            await started.wait()
            cancelled = await blog_factory.cancel_blog_factory_enhancement_job(snapshot.job_id, self.auth)

        self.assertEqual(cancelled.status, "cancelled")
        self.assertEqual(cancelled.error_message, "增强已取消。")


if __name__ == "__main__":
    unittest.main()
