import json
import unittest
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.services import ai_audit


class AiAuditTests(unittest.TestCase):
    def test_audit_record_has_correlation_fields_but_no_request_content(self) -> None:
        messages: list[str] = []

        class AuditLogger:
            def info(self, message: str) -> None:
                messages.append(message)

        with patch.object(ai_audit, "_get_audit_logger", return_value=AuditLogger()):
            ai_audit.log_ai_call(
                "completed",
                provider="codex",
                source="english-completion",
                username="learner",
                job_id="job-123",
                model_name="gpt-5.6",
                duration_ms=250,
            )

        self.assertEqual(len(messages), 1)
        record = json.loads(messages[0])
        self.assertEqual(record["event"], "completed")
        self.assertEqual(record["job_id"], "job-123")
        self.assertEqual(record["duration_ms"], 250)
        self.assertNotIn("prompt", record)
        self.assertNotIn("api_key", record)
        self.assertNotIn("response", record)

    def test_usage_and_configured_pricing_are_logged_as_an_estimate(self) -> None:
        messages: list[str] = []

        class AuditLogger:
            def info(self, message: str) -> None:
                messages.append(message)

        pricing = '{"test-model":{"input_per_million_usd":2,"cached_input_per_million_usd":1,"output_per_million_usd":8}}'
        with patch.object(ai_audit.settings, "ai_pricing_json", pricing), patch.object(ai_audit, "_get_audit_logger", return_value=AuditLogger()):
            ai_audit.log_ai_call(
                "completed",
                provider="openai-compatible",
                source="history-ask",
                model_name="test-model",
                usage={"input_tokens": 1_000_000, "cached_input_tokens": 200_000, "output_tokens": 500_000, "total_tokens": 1_500_000},
            )

        record = json.loads(messages[0])
        self.assertEqual(record["timezone"], "Asia/Shanghai")
        self.assertEqual(record["total_tokens"], 1_500_000)
        self.assertEqual(record["cost_status"], "estimated")
        self.assertEqual(record["estimated_cost_usd"], 5.8)


if __name__ == "__main__":
    unittest.main()
