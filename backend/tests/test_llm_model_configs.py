import unittest
from pathlib import Path
from unittest.mock import patch

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.llm_config import _api_key_for, make_model_selector, parse_model_selector


class LlmModelConfigSelectorTests(unittest.TestCase):
    def test_selector_round_trip_uses_the_stable_configuration_id(self) -> None:
        self.assertEqual(make_model_selector(42), "llm-config:42")
        self.assertEqual(parse_model_selector("llm-config:42"), 42)

    def test_invalid_selector_is_not_treated_as_a_configuration(self) -> None:
        self.assertIsNone(parse_model_selector("deepseek-chat"))
        self.assertIsNone(parse_model_selector("llm-config:0"))
        self.assertIsNone(parse_model_selector("llm-config:not-a-number"))

    def test_legacy_migration_uses_normal_sql_string_literals(self) -> None:
        source = Path("app/repositories/llm_config.py").read_text(encoding="utf-8")
        self.assertIn("nvl(source.provider_name, 'OpenAI Compatible')", source)
        self.assertNotIn("nvl(source.provider_name, ''OpenAI Compatible'')", source)

    def test_custom_key_loaded_from_backend_dotenv_when_not_exported(self) -> None:
        with patch("app.repositories.llm_config.os.getenv", return_value=None), patch(
            "app.repositories.llm_config.dotenv_values", return_value={"TRUSTED_KNOWLEDGE_LLM_ALFRED_API_KEY": "secret"}
        ):
            self.assertEqual(_api_key_for({"api_key_env_var": "TRUSTED_KNOWLEDGE_LLM_ALFRED_API_KEY"}), "secret")


if __name__ == "__main__":
    unittest.main()
