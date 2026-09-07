import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from fastapi import HTTPException

from app.api import codex, knowledge_processing
from app.repositories.users import AuthContext


class KnowledgeProcessingAuthorizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.auth = AuthContext(user_id=10, username="alice", is_admin=False, is_admin_role=False, visible_user_ids=(10,))
        codex._codex_jobs.clear()

    def tearDown(self) -> None:
        codex._codex_jobs.clear()

    def test_normal_user_can_address_own_configured_model_processing_job(self) -> None:
        job = codex.CodexJobState(job_id="processing-1", owner_username="alice", prompt="process", output_mode="final", execution_provider="history_ask_llm")
        codex._codex_jobs[job.job_id] = job
        self.assertIs(knowledge_processing._owned_processing_job(job.job_id, self.auth), job)

    def test_processing_route_cannot_expose_an_ai_coding_job(self) -> None:
        job = codex.CodexJobState(job_id="coding-1", owner_username="alice", prompt="code", output_mode="full", execution_provider="codex")
        codex._codex_jobs[job.job_id] = job
        with self.assertRaises(HTTPException):
            knowledge_processing._owned_processing_job(job.job_id, self.auth)


if __name__ == "__main__":
    unittest.main()
