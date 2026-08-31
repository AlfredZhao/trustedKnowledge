import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.blog_review import _build_review_prompt, _normalize_review_result, _supports_json_mode
from app.schemas.blog_factory import BlogFactoryReviewRequest, BlogFactoryReviewResult


class BlogReviewTests(unittest.TestCase):
    def test_review_prompt_marks_article_as_read_only_and_includes_context(self) -> None:
        payload = BlogFactoryReviewRequest(
            task_content="# Draft\n\nContent to review.",
            question_snapshot="What should this explain?",
            answer_snapshot="It should explain the review workflow.",
        )

        system, prompt = _build_review_prompt(payload, [])

        self.assertIn("只读材料", system)
        self.assertIn("before 必须是文章中可精确找到且只出现一次", system)
        self.assertIn(payload.task_content, prompt)
        self.assertIn(payload.question_snapshot, prompt)

    def test_no_issue_result_requires_empty_suggestions_contract(self) -> None:
        result = BlogFactoryReviewResult.model_validate(
            {"status": "no_issues", "summary": "按本次审阅范围未发现需要修改的问题。", "suggestions": []}
        )

        self.assertEqual(result.status, "no_issues")
        self.assertEqual(result.suggestions, [])

    def test_normalizes_deepseek_style_english_labels_and_issue_wrapper(self) -> None:
        article = "# Database security\n\nUse least privilege for every database account."

        result = BlogFactoryReviewResult.model_validate(
            _normalize_review_result(
                {
                    "result": {
                        "summary": "The recommendation needs a concrete safeguard.",
                        "issues": [
                            {
                                "id": 1,
                                "severity": "major",
                                "category": "security",
                                "issue": "The safeguard is too broad.",
                                "recommendation": "Specify account privileges.",
                                "original": "Use least privilege for every database account.",
                                "replacement": "Grant every database account only the privileges required for its assigned task.",
                            }
                        ],
                    }
                },
                article,
            )
        )

        self.assertEqual(result.status, "issues_found")
        self.assertEqual(result.suggestions[0].id, "1")
        self.assertEqual(result.suggestions[0].severity, "需要修改")
        self.assertEqual(result.suggestions[0].category, "表达")

    def test_drops_non_unique_replacements_and_returns_a_valid_no_issue_result(self) -> None:
        result = BlogFactoryReviewResult.model_validate(
            _normalize_review_result(
                {
                    "status": "issues found",
                    "summary": "A repeated excerpt cannot be safely replaced.",
                    "suggestions": [{"before": "same", "after": "better"}],
                },
                "same and same",
            )
        )

        self.assertEqual(result.status, "no_issues")
        self.assertEqual(result.suggestions, [])

    def test_json_mode_is_enabled_only_for_deepseek(self) -> None:
        self.assertTrue(_supports_json_mode({"base_url": "https://api.deepseek.com", "model_name": "deepseek-chat"}))
        self.assertFalse(_supports_json_mode({"base_url": "https://api.example.com", "model_name": "gpt-4"}))


if __name__ == "__main__":
    unittest.main()
