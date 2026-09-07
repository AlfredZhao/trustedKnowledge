import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.services import ai_audit_dashboard


class AiAuditDashboardTests(unittest.TestCase):
    def test_dashboard_aggregates_terminal_records_and_keeps_unfinished_jobs_separate(self) -> None:
        now = datetime.now().astimezone().isoformat()
        records = [
            {"timestamp": now, "event": "started", "job_id": "done", "username": "alice", "source": "history-ask"},
            {"timestamp": now, "event": "completed", "job_id": "done", "username": "alice", "source": "history-ask", "model_name": "test", "duration_ms": 200, "input_tokens": 100, "output_tokens": 20, "cached_input_tokens": 10, "total_tokens": 120, "estimated_cost_usd": 0.01},
            {"timestamp": now, "event": "timed_out", "job_id": "timeout", "username": "bob", "source": "english", "duration_ms": 500, "total_tokens": None},
            {"timestamp": now, "event": "started", "job_id": "unfinished", "username": "alice", "source": "english"},
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ai-audit.log"
            path.write_text("\n".join(json.dumps(item) for item in records) + "\nnot-json\n", encoding="utf-8")
            with patch.object(ai_audit_dashboard, "_AUDIT_LOG_PATH", path):
                result = ai_audit_dashboard.get_ai_audit_dashboard(days=1, username=None, source=None, model_name=None, event=None, limit=50, offset=0)

        self.assertEqual(result["summary"]["total_calls"], 2)
        self.assertEqual(result["summary"]["completed_calls"], 1)
        self.assertEqual(result["summary"]["timed_out_calls"], 1)
        self.assertEqual(result["summary"]["in_progress_calls"], 1)
        self.assertEqual(result["summary"]["total_tokens"], 120)
        self.assertEqual(result["summary"]["estimated_cost_usd"], 0.01)
        self.assertEqual(result["summary"]["success_rate"], 50.0)
        self.assertEqual(result["total"], 3)
        self.assertEqual(result["by_user"][0]["key"], "alice")

    def test_dashboard_filters_terminal_records(self) -> None:
        now = datetime.now().astimezone().isoformat()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ai-audit.log"
            path.write_text("\n".join(json.dumps(item) for item in [
                {"timestamp": now, "event": "completed", "username": "alice", "source": "history-ask"},
                {"timestamp": now, "event": "failed", "username": "bob", "source": "english"},
            ]), encoding="utf-8")
            with patch.object(ai_audit_dashboard, "_AUDIT_LOG_PATH", path):
                result = ai_audit_dashboard.get_ai_audit_dashboard(days=1, username="alice", source=None, model_name=None, event=None, limit=50, offset=0)

        self.assertEqual(result["summary"]["total_calls"], 1)
        self.assertEqual(result["items"][0]["username"], "alice")
        self.assertEqual(result["available_users"], ["alice", "bob"])


if __name__ == "__main__":
    unittest.main()
