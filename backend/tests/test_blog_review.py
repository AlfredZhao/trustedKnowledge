import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.blog_review import _build_review_prompt
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


if __name__ == "__main__":
    unittest.main()
