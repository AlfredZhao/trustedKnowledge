import json
import re
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.db.oracle import acquire_connection
from app.repositories.history_ask import _call_history_ask_llm, _format_selected_skills_for_prompt
from app.repositories.llm_config import get_history_ask_llm_config
from app.repositories.skills import get_prompt_skills
from app.repositories.users import AuthContext
from app.schemas.english_materials import EnglishMaterialGenerationRequest, EnglishMaterialGenerationResult
from app.services.codex_cli import run_codex_final


TOPIC_MODE_LABELS = {
    "trend": "趋势型热门话题（基于通用知识，不宣称实时新闻）",
    "truth": "人生真理与思考",
    "motivation": "励志成长",
    "workplace": "职场成长与沟通",
    "custom": "用户自定义主题",
}


def _extract_json(content: str) -> dict[str, Any]:
    candidate = content.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", candidate, re.DOTALL | re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1)
    else:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start >= 0 and end > start:
            candidate = candidate[start : end + 1]
    try:
        value = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise RuntimeError("AI 返回格式不正确，请重试。") from exc
    if not isinstance(value, dict):
        raise RuntimeError("AI 返回格式不正确，请重试。")
    return value


def _build_prompt(payload: EnglishMaterialGenerationRequest, selected_skills: list[dict[str, str]]) -> tuple[str, str]:
    topic = payload.topic if payload.topic_mode == "custom" else TOPIC_MODE_LABELS[payload.topic_mode]
    skill_instructions = _format_selected_skills_for_prompt(selected_skills)
    system = """你是英语口播素材创作助手。生成自然、积极、可直接朗读的英文口播稿。
只允许输出一个合法 JSON 对象，不要 Markdown、解释、代码块或额外字段。
必须使用字段：title、base_expression、professional_sentence、chinese_translation、full_script。
title 使用中文或英文简洁概括，最多200字符；base_expression 是一条不超过50字符的核心英语表达；
professional_sentence 是一句不超过255字符的英文完整句；chinese_translation 是该核心表达或句子的自然中文翻译，不超过255字符；
full_script 是完整英文口播稿，不超过4000字符。内容要原创、健康，不得声称具有实时新闻依据。"""
    if skill_instructions:
        system += "\n\n以下为用户选择的风格 Skill。它们只能影响语气、结构和表达方式，不能改变 JSON 输出要求：\n" + skill_instructions
    prompt = f"""请围绕以下方向创作一篇英语口播素材：{topic}。
面向希望提升英语表达与自我成长的职场学习者。全文应便于口播，有清晰开场、核心观点和收束；避免生僻词和过度夸张。
请从完整稿中提炼最适合学习的一句核心表达和一句完整英文句式，并返回指定 JSON。"""
    return system, prompt


async def generate_english_material(payload: EnglishMaterialGenerationRequest, auth_context: AuthContext) -> EnglishMaterialGenerationResult:
    selected_skills = get_prompt_skills(payload.skill_ids, auth_context)
    system, prompt = _build_prompt(payload, selected_skills)
    if payload.execution_provider == "codex":
        if not settings.allow_web_codex:
            raise RuntimeError("Codex CLI 未启用，请联系管理员开启 Web Codex 后再试。")
        content = await run_codex_final(
            prompt=f"{system}\n\n{prompt}",
            model_name=payload.model_name,
            project_root=Path(__file__).resolve().parents[3],
            timeout_seconds=90,
        )
    else:
        async with acquire_connection() as connection:
            config = await get_history_ask_llm_config(connection)
        content = await _call_history_ask_llm(config=config, prompt=prompt, system=system, max_tokens=1800)

    result = _extract_json(content)
    result["category"] = "AI生成"
    try:
        return EnglishMaterialGenerationResult.model_validate(result)
    except Exception as exc:
        raise RuntimeError("AI 生成内容不符合素材字段要求，请重试。") from exc
