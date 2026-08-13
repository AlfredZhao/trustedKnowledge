import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.api import system
from app.schemas.system import GithubReleaseRequest, GithubSyncResponse


class GithubReleaseTests(unittest.IsolatedAsyncioTestCase):
    def test_release_request_rejects_non_semver_version(self) -> None:
        with self.assertRaises(ValidationError):
            GithubReleaseRequest(version="0.3", confirm="ok")

    async def test_release_requires_exact_ok_confirmation(self) -> None:
        with self.assertRaises(HTTPException) as captured:
            await system.release_code_to_github(GithubReleaseRequest(version="0.3.9", confirm="OK"))

        self.assertEqual(captured.exception.status_code, 400)

    async def test_release_invokes_fixed_version_arguments(self) -> None:
        expected = GithubSyncResponse(
            success=True,
            message="GitHub release completed.",
            exit_code=0,
            output_tail="done",
            log_path="logs/web-github-sync.log",
            completed_at="2026-08-13T00:00:00+00:00",
        )
        with patch("app.api.system._run_github_script", new=AsyncMock(return_value=expected)) as run_script:
            result = await system.release_code_to_github(GithubReleaseRequest(version="0.3.9", confirm="ok"))

        self.assertEqual(result, expected)
        run_script.assert_awaited_once_with(
            ["--version", "0.3.9"],
            "GitHub release completed.",
            "GitHub release failed.",
        )


if __name__ == "__main__":
    unittest.main()
