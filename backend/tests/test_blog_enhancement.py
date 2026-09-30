import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.repositories.blog_enhancement import _build_enhancement_prompt
from app.schemas.blog_factory import BlogFactoryEnhancementRequest


class BlogEnhancementTests(unittest.TestCase):
    def test_prompt_preserves_article_assets_and_skill_role(self) -> None:
        payload = BlogFactoryEnhancementRequest(
            task_content="# 标题\n\n![](/api/media/demo/content)\n\n正文",
            question_snapshot="如何使用 Mermaid？",
            answer_snapshot="使用图表说明流程。",
        )

        system, prompt = _build_enhancement_prompt(payload, [{"content": "在流程说明后插入 Mermaid。"}])

        self.assertIn("不要删除或改变图片链接地址", system)
        self.assertIn("不能改变事实边界", system)
        self.assertIn("mermaid", system.lower())
        self.assertIn("用户修订要求优先于 Skill", system)
        self.assertIn(payload.task_content, prompt)
        self.assertIn("<article>", prompt)
        self.assertIn("按默认增强策略处理", prompt)

    def test_prompt_includes_user_revision_instruction_as_read_only_request(self) -> None:
        payload = BlogFactoryEnhancementRequest(
            task_content="# 标题\n\n正文",
            revision_instruction="面向初级开发者重写开头，但保留所有代码。",
        )

        system, prompt = _build_enhancement_prompt(payload, [])

        self.assertIn("优先满足它", system)
        self.assertIn("<user_revision_instruction>", prompt)
        self.assertIn(payload.revision_instruction, prompt)


if __name__ == "__main__":
    unittest.main()
