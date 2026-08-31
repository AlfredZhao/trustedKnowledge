import asyncio
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import oracledb

from app.core.config import settings
from app.db.oracle import acquire_connection
from app.repositories.llm_config import get_history_ask_llm_config
from app.repositories.history_ontology import find_matching_history_ontology_terms
from app.repositories.skills import get_prompt_skills
from app.repositories.todos import _ensure_todo_table
from app.repositories.users import AuthContext, append_requested_username_clause, append_user_visibility_clause
from app.services.codex_cli import run_codex_final


COMMON_WORDS = {
    "工作",
    "记录",
    "工作记录",
    "总结",
    "统计",
    "项目",
    "关于",
    "针对",
    "请",
    "帮我",
    "一下",
    "工作量",
}

LLM_ERROR_PREFIXES = ("HTTP异常", "API错误", "系统错误", "错误:")

DAY_ALIASES = {
    "D1": ["d1", "monday", "mon", "周一", "星期一", "礼拜一"],
    "D2": ["d2", "tuesday", "tue", "周二", "星期二", "礼拜二"],
    "D3": ["d3", "wednesday", "wed", "周三", "星期三", "礼拜三"],
    "D4": ["d4", "thursday", "thu", "周四", "星期四", "礼拜四"],
    "D5": ["d5", "friday", "fri", "周五", "星期五", "礼拜五"],
    "D6": ["d6", "saturday", "sat", "周六", "星期六", "礼拜六"],
    "D7": ["d7", "sunday", "sun", "周日", "周天", "星期日", "星期天", "礼拜日", "礼拜天"],
}


def _evidence_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row[0],
        "history_date": row[1],
        "type": row[2],
        "week": row[3],
        "day": row[4],
        "username": row[5],
        "content": row[6],
    }


def _public_query_parameters(params: dict[str, Any]) -> dict[str, str]:
    """Keep the audit view useful without exposing user identifiers or raw objects."""
    public_params: dict[str, str] = {}
    for key, value in params.items():
        if key.startswith(("visible_user_id_", "todo_visible_user_")):
            public_params[key] = "当前用户可见范围"
        elif isinstance(value, (date, datetime)):
            public_params[key] = value.isoformat()
        else:
            public_params[key] = str(value)
    return public_params


def _extract_quoted_keyword(question: str) -> str | None:
    match = re.search(r"[“\"']([^”\"']{2,100})[”\"']", question)
    if match:
        return match.group(1).strip()
    return None


def _extract_keyword(question: str) -> str | None:
    quoted = _extract_quoted_keyword(question)
    if quoted:
        return quoted

    match = re.search(r"关于(.{2,80}?)(?:项目|的|工作量|统计|总结|$)", question)
    if match:
        keyword = match.group(1).strip(" ，,。；;：:")
        if keyword and keyword not in COMMON_WORDS:
            return keyword

    return None


def _extract_username(question: str, users: list[str]) -> str | None:
    normalized_question = question.lower()
    for user in users:
        if user and user.lower() in normalized_question:
            return user
    return None


def _extract_existing_value(question: str, values: list[str]) -> str | None:
    normalized_question = question.lower()
    for value in sorted((item for item in values if item), key=len, reverse=True):
        if value.lower() in normalized_question:
            return value
    return None


def _extract_week(question: str) -> str | None:
    match = re.search(r"\b(\d{4}-W\d{1,2}|W\d{1,2})\b", question, re.IGNORECASE)
    if match:
        value = match.group(1).upper()
        week_number = int(value.split("W", 1)[1])
        if 1 <= week_number <= 53:
            return f"W{week_number}"
        return None

    match = re.search(r"(?:第)?(\d{1,2})(?:周|week)", question, re.IGNORECASE)
    if match:
        week_number = int(match.group(1))
        if 1 <= week_number <= 53:
            return f"W{week_number}"

    return None


def _extract_day(question: str) -> str | None:
    normalized_question = question.lower()
    for day, aliases in DAY_ALIASES.items():
        if any(alias in normalized_question for alias in aliases):
            return day
    return None


def _extract_learn_level(question: str) -> int | None:
    match = re.search(r"(?:level|等级|级别|层级)\s*(?:=|为|是|:|：)?\s*(\d{1,2})", question, re.IGNORECASE)
    if not match:
        return None

    level = int(match.group(1))
    return level if 0 <= level <= 99 else None


def _extract_vector_status(question: str) -> int | None:
    if re.search(r"向量.{0,6}(?:待更新|未更新|需更新|需要更新)|(?:待更新|未更新|需更新|需要更新).{0,6}向量", question):
        return 1
    if re.search(r"向量.{0,6}(?:就绪|已更新|完成|正常)|(?:就绪|已更新|完成|正常).{0,6}向量", question):
        return 0
    return None


def _month_end(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


CHINESE_NUMBER_ALIASES = {
    "一": 1,
    "两": 2,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}


def _parse_small_count(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    return CHINESE_NUMBER_ALIASES.get(value)


def _extract_date_range(question: str, *, anchor_date: date | None = None) -> tuple[date | None, date | None]:
    today = date.today()
    relative_anchor = anchor_date or today

    range_match = re.search(
        r"(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?\s*(?:到|至|-|~|—)\s*(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?",
        question,
    )
    if range_match:
        start = date(int(range_match.group(1)), int(range_match.group(2)), int(range_match.group(3)))
        end = date(int(range_match.group(4)), int(range_match.group(5)), int(range_match.group(6)))
        return (start, end) if start <= end else (end, start)

    day_match = re.search(r"(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?", question)
    if day_match:
        value = date(int(day_match.group(1)), int(day_match.group(2)), int(day_match.group(3)))
        return value, value

    month_match = re.search(r"(\d{4})[-年/](\d{1,2})月?", question)
    if month_match:
        year = int(month_match.group(1))
        month = int(month_match.group(2))
        if 1 <= month <= 12:
            return date(year, month, 1), _month_end(year, month)

    recent_match = re.search(r"(?:最近|近)(\d{1,3})(?:天|日)", question)
    if recent_match:
        days = max(1, min(365, int(recent_match.group(1))))
        return relative_anchor - timedelta(days=days - 1), relative_anchor

    recent_week_match = re.search(r"(?:最近|近)\s*([一两二三四五六七八九十]|\d{1,2})\s*(?:个)?(?:周|星期|礼拜)", question)
    if recent_week_match:
        weeks = _parse_small_count(recent_week_match.group(1))
        if weeks is not None:
            days = max(1, min(52, weeks)) * 7
            return relative_anchor - timedelta(days=days - 1), relative_anchor

    recent_month_match = re.search(r"(?:最近|近)\s*([一两二三四五六七八九十]|\d{1,2})\s*(?:个)?月", question)
    if recent_month_match:
        months = _parse_small_count(recent_month_match.group(1))
        if months is not None:
            days = max(1, min(12, months)) * 30
            return relative_anchor - timedelta(days=days - 1), relative_anchor

    if "今天" in question:
        return today, today
    if "昨天" in question:
        yesterday = today - timedelta(days=1)
        return yesterday, yesterday
    if "本周" in question or "这周" in question:
        start = today - timedelta(days=today.weekday())
        return start, today
    if "上周" in question:
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6)
    if "本月" in question or "这个月" in question:
        return date(today.year, today.month, 1), today
    if "上月" in question or "上个月" in question:
        previous_month = today.month - 1 or 12
        year = today.year if today.month > 1 else today.year - 1
        return date(year, previous_month, 1), _month_end(year, previous_month)

    return None, None


def _normalize_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _append_filter_clauses(
    clauses: list[str],
    params: dict[str, Any],
    *,
    keyword: str | None,
    keyword_terms: list[str] | None = None,
    username: str | None,
    history_type: str | None,
    week: str | None,
    day: str | None,
    learn_level: int | None,
    vector_status: int | None,
    date_from: date | None = None,
    date_to: date | None = None,
    auth_context: AuthContext | None = None,
) -> None:
    search_terms = list(dict.fromkeys(item for item in [keyword, *(keyword_terms or [])] if item))
    if search_terms:
        keyword_clauses = []
        for index, value in enumerate(search_terms):
            bind_name = f"keyword_{index}"
            keyword_clauses.append(f"lower(history_record.content) like '%' || lower(:{bind_name}) || '%'")
            params[bind_name] = value
        clauses.append("(" + " or ".join(keyword_clauses) + ")")
    if username:
        clauses.append("lower(coalesce(record_user.username, history_record.username)) = lower(:username)")
        params["username"] = username
    if history_type:
        clauses.append("lower(history_record.type) = lower(:history_type)")
        params["history_type"] = history_type
    if week:
        clauses.append("lower(history_record.week) = lower(:week)")
        params["week"] = week
    if day:
        clauses.append("lower(history_record.day) = lower(:day)")
        params["day"] = day
    if learn_level is not None:
        clauses.append("history_record.learn_level = :learn_level")
        params["learn_level"] = learn_level
    if vector_status is not None:
        clauses.append("history_record.v_needs_update = :vector_status")
        params["vector_status"] = vector_status
    if date_from is not None:
        clauses.append("history_record.history_date >= :date_from")
        params["date_from"] = date_from
    if date_to is not None:
        clauses.append("history_record.history_date < :date_to + 1")
        params["date_to"] = date_to
    if auth_context is not None:
        _append_visibility_clause(clauses, params, auth_context)


async def _fetch_latest_history_date(
    cursor: Any,
    *,
    keyword: str | None,
    keyword_terms: list[str] | None = None,
    username: str | None,
    history_type: str | None,
    week: str | None,
    day: str | None,
    learn_level: int | None,
    vector_status: int | None,
    auth_context: AuthContext,
) -> date | None:
    clauses: list[str] = []
    params: dict[str, Any] = {}
    _append_filter_clauses(
        clauses,
        params,
        keyword=keyword,
        keyword_terms=keyword_terms,
        username=username,
        history_type=history_type,
        week=week,
        day=day,
        learn_level=learn_level,
        vector_status=vector_status,
        auth_context=auth_context,
    )
    where_sql = " where " + " and ".join(clauses) if clauses else ""
    await cursor.execute(
        f"""
        select max(trunc(history_record.history_date))
        from t_history history_record
        left join tk_users record_user on record_user.user_id = history_record.user_id
        {where_sql}
        """,
        params,
    )
    row = await cursor.fetchone()
    return _normalize_date(row[0]) if row else None


def _count_rows_to_dict(rows: list[Any]) -> dict[str, int]:
    return {str(row[0]): int(row[1]) for row in rows}


async def _fetch_count_distribution(
    cursor: Any,
    *,
    expression: str,
    where_sql: str,
    params: dict[str, Any],
    limit: int = 12,
) -> dict[str, int]:
    await cursor.execute(
        f"""
            select {expression} as label, count(*) as item_count
            from t_history history_record
            left join tk_users record_user on record_user.user_id = history_record.user_id
            {where_sql}
            group by {expression}
            order by item_count desc, label
            fetch next :distribution_limit rows only
        """,
        {**params, "distribution_limit": limit},
    )
    return _count_rows_to_dict(await cursor.fetchall())


def _append_visibility_clause(clauses: list[str], params: dict[str, Any], auth_context: AuthContext) -> None:
    if auth_context.is_admin or auth_context.visible_user_ids is None:
        return
    if not auth_context.visible_user_ids:
        clauses.append("1 = 0")
        return
    bind_names = []
    for index, user_id in enumerate(auth_context.visible_user_ids):
        bind_name = f"visible_user_id_{index}"
        bind_names.append(bind_name)
        params[bind_name] = user_id
    clauses.append(f"history_record.user_id in ({', '.join(f':{name}' for name in bind_names)})")


def _trim_content(value: str | None, limit: int = 260) -> str:
    if not value:
        return ""
    collapsed = re.sub(r"\s+", " ", value).strip()
    return collapsed if len(collapsed) <= limit else collapsed[: limit - 1] + "..."


def _build_fallback_answer(
    *,
    question: str,
    filters: dict[str, Any],
    stats: dict[str, Any],
    evidence: list[dict[str, Any]],
    selected_skills: list[dict[str, str]] | None = None,
) -> str:
    keyword = filters.get("keyword")
    username = filters.get("username")
    subject = keyword or "该主题"
    user_text = f"{username} 的" if username else ""
    if stats["matched_count"] == 0:
        return f"未找到与 {user_text}{subject} 相关的历史记录。可以换一个关键词，或放宽用户、项目名称等条件再查询。"

    filter_text = _format_filter_summary(filters)
    lines = [
        f"根据当前可检索的业务记录，{user_text}{subject} 相关记录共 {stats['matched_count']} 条，覆盖 {stats['active_days']} 个活跃日期。",
    ]
    if filter_text:
        lines.append(f"识别条件：{filter_text}。")
    if stats["min_date"] and stats["max_date"]:
        lines.append(f"时间范围：{stats['min_date']} 至 {stats['max_date']}。")
    if stats["type_counts"]:
        type_text = "、".join(f"{key} {value} 条" for key, value in stats["type_counts"].items())
        lines.append(f"类型分布：{type_text}。")
    if stats["week_counts"]:
        week_text = "、".join(f"{key} {value} 条" for key, value in list(stats["week_counts"].items())[:6])
        lines.append(f"主要周期：{week_text}。")
    if evidence:
        lines.append("代表性记录：" + "；".join(_trim_content(item.get("content"), 80) for item in evidence[:3] if item.get("content")))
    lines.append("说明：当前表没有明确工时字段，因此这里的工作量按记录数、活跃日期和类型分布统计。")
    if question:
        lines.append(f"原始问题：{question}")
    if selected_skills:
        lines.append("已选择 Skill：" + "、".join(item["name"] for item in selected_skills))
    return "\n".join(lines)


def _normalize_chat_completions_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if normalized.endswith("/chat/completions"):
        return normalized
    return f"{normalized}/chat/completions"


def _call_openai_compatible_llm_sync(
    *,
    base_url: str,
    api_key: str,
    model_name: str,
    prompt: str,
    system: str,
    max_tokens: int = 1200,
    response_format: dict[str, str] | None = None,
) -> str:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format
    request = Request(
        _normalize_chat_completions_url(base_url),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=45) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {error.code}: {body}") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(str(error)) from error

    choices = response_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise RuntimeError("LLM 响应缺少 choices")

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("LLM 响应缺少回答内容")
    return content.strip()


async def _call_history_ask_llm(
    *,
    config: dict[str, Any],
    prompt: str,
    system: str,
    max_tokens: int = 1200,
    response_format: dict[str, str] | None = None,
) -> str:
    base_url = str(config.get("base_url") or "").strip()
    api_key = settings.history_ask_llm_api_key.strip()
    model_name = str(config.get("model_name") or "").strip()
    if not base_url or not api_key or not model_name:
        raise RuntimeError("LLM 配置未完整填写，需要 Base URL、模型名和后端环境变量 TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY。")

    return await asyncio.to_thread(
        _call_openai_compatible_llm_sync,
        base_url=base_url,
        api_key=api_key,
        model_name=model_name,
        prompt=prompt,
        system=system,
        max_tokens=max_tokens,
        response_format=response_format,
    )


def _format_filter_summary(filters: dict[str, Any]) -> str:
    labels = {
        "keyword": "关键词",
        "username": "用户",
        "type": "类型",
        "week": "周期",
        "day": "Day",
        "learn_level": "等级",
        "vector_status": "向量状态",
        "date_from": "开始日期",
        "date_to": "结束日期",
    }
    values = []
    for key, label in labels.items():
        value = filters.get(key)
        if value is None or value == "":
            continue
        if key == "vector_status":
            value = "待更新" if value == 1 else "已就绪"
        values.append(f"{label}={value}")
    return "；".join(values)


def _format_selected_skills_for_prompt(selected_skills: list[dict[str, str]]) -> str:
    if not selected_skills:
        return ""
    blocks = []
    for skill in selected_skills:
        blocks.append(
            "\n".join(
                [
                    "Instructions:",
                    skill.get("content") or "",
                ]
            )
        )
    return "\n\n".join(blocks)


async def ask_history(
    question: str,
    *,
    skill_ids: list[str] | None = None,
    execution_provider: str = "history_ask_llm",
    model_name: str = "",
    domain_code: str = "history",
    auth_context: AuthContext,
) -> dict[str, Any]:
    if domain_code == "todos":
        return await _ask_todos(
            question,
            skill_ids=skill_ids,
            execution_provider=execution_provider,
            model_name=model_name,
            auth_context=auth_context,
        )
    if domain_code == "knowledge":
        return await _ask_knowledge(
            question,
            skill_ids=skill_ids,
            execution_provider=execution_provider,
            model_name=model_name,
            auth_context=auth_context,
        )
    if domain_code == "english_materials":
        return await _ask_english_materials(
            question,
            skill_ids=skill_ids,
            execution_provider=execution_provider,
            model_name=model_name,
            auth_context=auth_context,
        )
    selected_skills = get_prompt_skills(skill_ids or [], auth_context, agent_code="history-ask")
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        visibility_clauses: list[str] = []
        visibility_params: dict[str, Any] = {}
        _append_visibility_clause(visibility_clauses, visibility_params, auth_context)
        visibility_sql = " and " + " and ".join(visibility_clauses) if visibility_clauses else ""
        from_sql = """
            from t_history history_record
            left join tk_users record_user on record_user.user_id = history_record.user_id
        """
        await cursor.execute(
            f"""
            select distinct coalesce(record_user.username, history_record.username) as username
            {from_sql}
            where coalesce(record_user.username, history_record.username) is not null
            {visibility_sql}
            """,
            visibility_params,
        )
        users = [row[0] for row in await cursor.fetchall()]
        await cursor.execute(
            f"""
            select distinct history_record.type
            {from_sql}
            where history_record.type is not null
            {visibility_sql}
            """,
            visibility_params,
        )
        history_types = [row[0] for row in await cursor.fetchall()]

        keyword = _extract_keyword(question)
        matched_semantic_terms = await find_matching_history_ontology_terms(connection, question, auth_context, "history")
        semantic_keywords = list(
            dict.fromkeys(
                label
                for term in matched_semantic_terms
                for label in [term["name"], *term["aliases"]]
            )
        )
        if matched_semantic_terms and not keyword:
            keyword = matched_semantic_terms[0]["name"]
        username = _extract_username(question, users)
        history_type = _extract_existing_value(question, history_types)
        week = _extract_week(question)
        day = _extract_day(question)
        learn_level = _extract_learn_level(question)
        vector_status = _extract_vector_status(question)
        anchor_date = await _fetch_latest_history_date(
            cursor,
            keyword=keyword,
            keyword_terms=semantic_keywords,
            username=username,
            history_type=history_type,
            week=week,
            day=day,
            learn_level=learn_level,
            vector_status=vector_status,
            auth_context=auth_context,
        )
        date_from, date_to = _extract_date_range(question, anchor_date=anchor_date)

        clauses: list[str] = []
        params: dict[str, Any] = {}
        _append_filter_clauses(
            clauses,
            params,
            keyword=keyword,
            keyword_terms=semantic_keywords,
            username=username,
            history_type=history_type,
            week=week,
            day=day,
            learn_level=learn_level,
            vector_status=vector_status,
            date_from=date_from,
            date_to=date_to,
            auth_context=auth_context,
        )

        where_sql = " where " + " and ".join(clauses) if clauses else ""
        filters = {
            "keyword": keyword,
            "username": username,
            "type": history_type,
            "week": week,
            "day": day,
            "learn_level": learn_level,
            "vector_status": vector_status,
            "date_from": date_from,
            "date_to": date_to,
            "semantic_terms": [term["name"] for term in matched_semantic_terms],
        }
        stats_sql = f"""
            select
                count(*),
                count(distinct trunc(history_record.history_date)),
                min(trunc(history_record.history_date)),
                max(trunc(history_record.history_date))
            {from_sql}
            {where_sql}
        """
        evidence_sql = f"""
            select
                history_record.id,
                history_record.history_date,
                history_record.type,
                history_record.week,
                history_record.day,
                coalesce(record_user.username, history_record.username) as username,
                history_record.content
            {from_sql}
            {where_sql}
            order by history_record.history_date desc nulls last, history_record.id desc
            fetch next 80 rows only
        """

        await cursor.execute(stats_sql, params)
        stats_row = await cursor.fetchone()

        await cursor.execute(evidence_sql, params)
        rows = [_evidence_row_to_dict(row) for row in await cursor.fetchall()]

        stats = {
            "matched_count": int(stats_row[0]) if stats_row else 0,
            "active_days": int(stats_row[1]) if stats_row else 0,
            "min_date": stats_row[2] if stats_row else None,
            "max_date": stats_row[3] if stats_row else None,
            "type_counts": await _fetch_count_distribution(
                cursor,
                expression="coalesce(history_record.type, '未分类')",
                where_sql=where_sql,
                params=params,
            ),
            "week_counts": await _fetch_count_distribution(
                cursor,
                expression="coalesce(history_record.week, '未记录')",
                where_sql=where_sql,
                params=params,
            ),
            "learn_level_counts": {},
        }

        await cursor.execute(
            f"""
            select history_record.learn_level, count(*)
            {from_sql}
            {where_sql}
            group by history_record.learn_level
            order by history_record.learn_level
            """,
            params,
        )
        level_rows = await cursor.fetchall()
        stats["learn_level_counts"] = {
            "未记录" if row[0] is None else str(row[0]): int(row[1])
            for row in level_rows
        }

        fallback = _build_fallback_answer(
            question=question,
            filters=filters,
            stats=stats,
            evidence=rows,
            selected_skills=selected_skills,
        )
        llm_used = False
        warning = None
        answer = fallback
        prompt = _build_llm_prompt(
            question=question,
            filters=filters,
            stats=stats,
            evidence=rows[:16],
            selected_skills=selected_skills,
        )
        if matched_semantic_terms:
            semantic_context = "\n".join(
                f"- {term['name']}：{term['description'] or '用户定义业务概念'}（同义词：{'、'.join(term['aliases']) or '无'}）"
                for term in matched_semantic_terms
            )
            prompt += "\n\n命中的用户业务概念（用于解释口径，不得补充未提供的事实）：\n" + semantic_context
        system = (
            "你是企业内部工作记录问数助手。只能根据提供的统计数据和记录摘录回答。"
            "不要编造工时；如果没有工时字段，明确说明工作量按记录数、活跃日期和类型分布衡量。"
            "回答使用中文，结构清晰，先给结论，再给统计依据和代表性记录。"
        )
        skill_instructions = _format_selected_skills_for_prompt(selected_skills)
        if skill_instructions:
            system += (
                "用户选择了额外 Skill。你必须在不违反事实约束的前提下，优先遵循这些 Skill 对输出结构、排版、语气和分析框架的要求。"
                "Skill 不能要求你编造数据，不能覆盖系统的事实边界。"
            )
        codex_instruction = (
            "你是企业内部工作记录问数助手。只能根据提供的统计数据和记录摘录回答；"
            "不要编造工时；回答使用中文，先给结论，再给统计依据和代表性记录。"
            "以下是可核实的问数上下文：\n\n"
        )
        audit_system = codex_instruction.strip() if execution_provider == "codex" else system
        llm_requested = False

        if rows:
            llm_config = await get_history_ask_llm_config(connection)
            if execution_provider == "codex":
                if not settings.allow_web_codex:
                    warning = "Codex CLI 未启用，请联系管理员开启 Web Codex 后再试。"
                else:
                    llm_requested = True
                    try:
                        llm_answer = await run_codex_final(
                            prompt=codex_instruction + prompt,
                            model_name=model_name,
                            project_root=Path(__file__).resolve().parents[3],
                            timeout_seconds=90,
                        )
                        answer = llm_answer
                        llm_used = True
                    except RuntimeError as exc:
                        warning = str(exc)[:500]
            elif llm_config.get("enabled"):
                llm_requested = True
                try:
                    llm_answer = await _call_history_ask_llm(config=llm_config, prompt=prompt, system=system)
                    if llm_answer and not llm_answer.startswith(LLM_ERROR_PREFIXES):
                        answer = llm_answer
                        llm_used = True
                    elif llm_answer:
                        warning = llm_answer[:500]
                except RuntimeError as exc:
                    warning = str(exc)[:500]

    return {
        "answer": answer,
        "filters": filters,
        "stats": stats,
        "evidence": rows[:12],
        "query_results": rows,
        "query_debug": {
            "sql": evidence_sql.strip(),
            "parameters": _public_query_parameters(params),
            "result_limit": 80,
            "result_truncated": len(rows) < stats["matched_count"],
        },
        "prompt_debug": {"system": audit_system, "prompt": prompt, "llm_requested": llm_requested},
        "llm_used": llm_used,
        "warning": warning,
        "selected_skills": [
            {"id": item["id"], "name": item["name"], "description": item.get("description", "")}
            for item in selected_skills
        ],
        "domain": {"code": "history", "name": "历史工作记录", "description": "基于工作记录、类型、周期和学习等级。", "source_tables": ["T_HISTORY", "TK_USERS"]},
    }


async def _ask_todos(
    question: str,
    *,
    skill_ids: list[str] | None,
    execution_provider: str,
    model_name: str,
    auth_context: AuthContext,
) -> dict[str, Any]:
    selected_skills = get_prompt_skills(skill_ids or [], auth_context, agent_code="todo-ask")
    async with acquire_connection() as connection:
        await _ensure_todo_table(connection)
        cursor = connection.cursor()
        keyword = _extract_keyword(question)
        matched_terms = await find_matching_history_ontology_terms(connection, question, auth_context, "todos")
        semantic_keywords = list(dict.fromkeys(label for term in matched_terms for label in [term["name"], *term["aliases"]]))
        if matched_terms and not keyword:
            keyword = matched_terms[0]["name"]
        if auth_context.is_admin or auth_context.visible_user_ids is None:
            await cursor.execute("select username from tk_users where status = 'ACTIVE'")
        else:
            bind_names = []
            user_params: dict[str, Any] = {}
            for index, user_id in enumerate(auth_context.visible_user_ids):
                bind_name = f"todo_visible_user_{index}"
                bind_names.append(f":{bind_name}")
                user_params[bind_name] = user_id
            await cursor.execute(
                f"select username from tk_users where user_id in ({', '.join(bind_names)}) and status = 'ACTIVE'",
                user_params,
            )
        visible_usernames = [str(row[0]) for row in await cursor.fetchall()]
        username = _extract_username(question, visible_usernames)
        todo_status = _extract_existing_value(question, ["待处理", "处理中", "已完成"])
        date_from, date_to = _extract_date_range(question)
        clauses: list[str] = []
        params: dict[str, Any] = {}
        search_terms = list(dict.fromkeys(item for item in [keyword, *semantic_keywords] if item))
        if search_terms:
            expressions = []
            for index, value in enumerate(search_terms):
                bind_name = f"todo_keyword_{index}"
                expressions.append(
                    f"(lower(dbms_lob.substr(todo_item.title, 4000, 1)) like '%' || lower(:{bind_name}) || '%' "
                    f"or lower(dbms_lob.substr(todo_item.content, 4000, 1)) like '%' || lower(:{bind_name}) || '%' "
                    f"or lower(todo_item.source) like '%' || lower(:{bind_name}) || '%' "
                    f"or lower(todo_item.topic_tag) like '%' || lower(:{bind_name}) || '%')"
                )
                params[bind_name] = value
            clauses.append("(" + " or ".join(expressions) + ")")
        if todo_status:
            clauses.append("todo_item.todo_status = :todo_status")
            params["todo_status"] = todo_status
        if date_from:
            clauses.append("todo_item.created_at >= :date_from")
            params["date_from"] = date_from
        if date_to:
            clauses.append("todo_item.created_at < :date_to + 1")
            params["date_to"] = date_to
        append_user_visibility_clause(clauses, params, auth_context, "todo_item.user_id")
        await append_requested_username_clause(connection, clauses, params, auth_context, username, "todo_item.user_id")
        where_sql = " where " + " and ".join(clauses) if clauses else ""
        from_sql = "from ai_todo_items todo_item left join tk_users todo_user on todo_user.user_id = todo_item.user_id"
        await cursor.execute(
            f"""
            select count(*), count(distinct trunc(todo_item.created_at)), min(trunc(todo_item.created_at)), max(trunc(todo_item.created_at))
            {from_sql} {where_sql}
            """,
            params,
        )
        stats_row = await cursor.fetchone()
        evidence_sql = f"""
            select todo_item.id, todo_item.created_at, todo_item.todo_status, todo_item.topic_tag, null,
                   todo_user.username, dbms_lob.substr(todo_item.title, 1000, 1) || case when todo_item.content is not null then '：' || dbms_lob.substr(todo_item.content, 3000, 1) end
            {from_sql} {where_sql}
            order by todo_item.created_at desc nulls last, todo_item.id desc fetch next 80 rows only
        """
        await cursor.execute(evidence_sql, params)
        rows = [_evidence_row_to_dict(row) for row in await cursor.fetchall()]

        async def distribution(expression: str) -> dict[str, int]:
            await cursor.execute(
                f"select {expression}, count(*) {from_sql} {where_sql} group by {expression} order by count(*) desc fetch next 12 rows only",
                params,
            )
            return _count_rows_to_dict(await cursor.fetchall())

        stats = {
            "matched_count": int(stats_row[0]) if stats_row else 0,
            "active_days": int(stats_row[1]) if stats_row else 0,
            "min_date": stats_row[2] if stats_row else None,
            "max_date": stats_row[3] if stats_row else None,
            "type_counts": await distribution("todo_item.todo_status"),
            "week_counts": await distribution("coalesce(todo_item.topic_tag, '未标记')"),
            "learn_level_counts": {},
        }
        filters = {
            "keyword": keyword,
            "username": username,
            "type": todo_status,
            "week": None,
            "day": None,
            "learn_level": None,
            "vector_status": None,
            "date_from": date_from,
            "date_to": date_to,
            "semantic_terms": [term["name"] for term in matched_terms],
        }
        answer = _build_fallback_answer(question=question, filters=filters, stats=stats, evidence=rows, selected_skills=selected_skills)
        llm_used = False
        warning = None
        prompt = _build_llm_prompt(question=question, filters=filters, stats=stats, evidence=rows[:16], selected_skills=selected_skills)
        if matched_terms:
            prompt += "\n\n命中的待办业务概念：\n" + "\n".join(
                f"- {term['name']}：{term['description'] or '用户定义业务概念'}（同义词：{'、'.join(term['aliases']) or '无'}）"
                for term in matched_terms
            )
        system = "你是企业内部待办事项问数助手。只能依据统计和待办摘录回答，不得编造事实。使用中文，先给结论再说明依据。"
        codex_instruction = "你是企业内部待办事项问数助手。只能根据提供的统计和摘录回答，使用中文。\n\n"
        audit_system = codex_instruction.strip() if execution_provider == "codex" else system
        llm_requested = False
        if rows:
            if execution_provider == "codex" and settings.allow_web_codex:
                llm_requested = True
                try:
                    answer = await run_codex_final(
                        prompt=codex_instruction + prompt,
                        model_name=model_name,
                        project_root=Path(__file__).resolve().parents[3],
                        timeout_seconds=90,
                    )
                    llm_used = True
                except RuntimeError as exc:
                    warning = str(exc)[:500]
            elif execution_provider == "codex":
                warning = "Codex CLI 未启用，请联系管理员开启 Web Codex 后再试。"
            else:
                config = await get_history_ask_llm_config(connection)
                if config.get("enabled"):
                    llm_requested = True
                    try:
                        llm_answer = await _call_history_ask_llm(
                            config=config,
                            prompt=prompt,
                            system=system,
                        )
                        if llm_answer and not llm_answer.startswith(LLM_ERROR_PREFIXES):
                            answer, llm_used = llm_answer, True
                        elif llm_answer:
                            warning = llm_answer[:500]
                    except RuntimeError as exc:
                        warning = str(exc)[:500]
    return {
        "answer": answer,
        "filters": filters,
        "stats": stats,
        "evidence": rows[:12],
        "query_results": rows,
        "query_debug": {
            "sql": evidence_sql.strip(),
            "parameters": _public_query_parameters(params),
            "result_limit": 80,
            "result_truncated": len(rows) < stats["matched_count"],
        },
        "prompt_debug": {"system": audit_system, "prompt": prompt, "llm_requested": llm_requested},
        "llm_used": llm_used,
        "warning": warning,
        "selected_skills": [{"id": item["id"], "name": item["name"], "description": item.get("description", "")} for item in selected_skills],
        "domain": {"code": "todos", "name": "待办事项", "description": "基于待办标题、内容、状态、标签和来源。", "source_tables": ["AI_TODO_ITEMS", "TK_USERS"]},
    }


async def _fetch_visible_usernames(cursor: Any, auth_context: AuthContext) -> list[str]:
    if auth_context.is_admin or auth_context.visible_user_ids is None:
        await cursor.execute("select username from tk_users where status = 'ACTIVE'")
    elif not auth_context.visible_user_ids:
        return []
    else:
        params = {f"catalog_visible_user_{index}": user_id for index, user_id in enumerate(auth_context.visible_user_ids)}
        bind_names = ", ".join(f":{name}" for name in params)
        await cursor.execute(f"select username from tk_users where user_id in ({bind_names}) and status = 'ACTIVE'", params)
    return [str(row[0]) for row in await cursor.fetchall()]


async def _finalize_catalog_ask(
    *,
    connection: Any,
    question: str,
    filters: dict[str, Any],
    stats: dict[str, Any],
    rows: list[dict[str, Any]],
    evidence_sql: str,
    params: dict[str, Any],
    selected_skills: list[dict[str, str]],
    matched_terms: list[dict[str, Any]],
    execution_provider: str,
    model_name: str,
    domain: dict[str, Any],
    assistant_name: str,
    semantic_label: str,
) -> dict[str, Any]:
    answer = _build_fallback_answer(question=question, filters=filters, stats=stats, evidence=rows, selected_skills=selected_skills)
    prompt = _build_llm_prompt(question=question, filters=filters, stats=stats, evidence=rows[:16], selected_skills=selected_skills)
    if matched_terms:
        prompt += "\n\n" + semantic_label + "：\n" + "\n".join(
            f"- {term['name']}：{term['description'] or '用户定义业务概念'}（同义词：{'、'.join(term['aliases']) or '无'}）"
            for term in matched_terms
        )
    system = f"你是{assistant_name}。只能依据统计和记录摘录回答，不得编造事实。使用中文，先给结论再说明依据。"
    skill_instructions = _format_selected_skills_for_prompt(selected_skills)
    if skill_instructions:
        system += "已选择的 Skill 仅可影响表达、结构和分析框架，不能覆盖事实边界。"
    codex_instruction = system + "\n\n"
    audit_system = codex_instruction.strip() if execution_provider == "codex" else system
    llm_used = False
    llm_requested = False
    warning = None
    if rows:
        if execution_provider == "codex":
            if not settings.allow_web_codex:
                warning = "Codex CLI 未启用，请联系管理员开启 Web Codex 后再试。"
            else:
                llm_requested = True
                try:
                    answer = await run_codex_final(prompt=codex_instruction + prompt, model_name=model_name, project_root=Path(__file__).resolve().parents[3], timeout_seconds=90)
                    llm_used = True
                except RuntimeError as exc:
                    warning = str(exc)[:500]
        else:
            config = await get_history_ask_llm_config(connection)
            if config.get("enabled"):
                llm_requested = True
                try:
                    llm_answer = await _call_history_ask_llm(config=config, prompt=prompt, system=system)
                    if llm_answer and not llm_answer.startswith(LLM_ERROR_PREFIXES):
                        answer, llm_used = llm_answer, True
                    elif llm_answer:
                        warning = llm_answer[:500]
                except RuntimeError as exc:
                    warning = str(exc)[:500]
    return {
        "answer": answer, "filters": filters, "stats": stats, "evidence": rows[:12], "query_results": rows,
        "query_debug": {"sql": evidence_sql.strip(), "parameters": _public_query_parameters(params), "result_limit": 80, "result_truncated": len(rows) < stats["matched_count"]},
        "prompt_debug": {"system": audit_system, "prompt": prompt, "llm_requested": llm_requested},
        "llm_used": llm_used, "warning": warning,
        "selected_skills": [{"id": item["id"], "name": item["name"], "description": item.get("description", "")} for item in selected_skills],
        "domain": domain,
    }


async def _ask_knowledge(
    question: str, *, skill_ids: list[str] | None, execution_provider: str, model_name: str, auth_context: AuthContext
) -> dict[str, Any]:
    selected_skills = get_prompt_skills(skill_ids or [], auth_context, agent_code="knowledge-ask")
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        keyword = _extract_keyword(question)
        matched_terms = await find_matching_history_ontology_terms(connection, question, auth_context, "knowledge")
        semantic_keywords = list(dict.fromkeys(label for term in matched_terms for label in [term["name"], *term["aliases"]]))
        if matched_terms and not keyword:
            keyword = matched_terms[0]["name"]
        username = _extract_username(question, await _fetch_visible_usernames(cursor, auth_context))
        record_type = _extract_existing_value(question, ["未发布", "已发布", "跳过"])
        date_from, date_to = _extract_date_range(question)
        clauses: list[str] = []
        params: dict[str, Any] = {}
        terms = list(dict.fromkeys(item for item in [keyword, *semantic_keywords] if item))
        if terms:
            expressions = []
            for index, value in enumerate(terms):
                bind_name = f"knowledge_keyword_{index}"
                expressions.append(f"(lower(knowledge_record.question) like '%' || lower(:{bind_name}) || '%' or lower(dbms_lob.substr(knowledge_record.answer, 4000, 1)) like '%' || lower(:{bind_name}) || '%' or lower(knowledge_record.source) like '%' || lower(:{bind_name}) || '%' or lower(knowledge_record.topic_tag) like '%' || lower(:{bind_name}) || '%')")
                params[bind_name] = value
            clauses.append("(" + " or ".join(expressions) + ")")
        if record_type:
            clauses.append("knowledge_record.blog_status = :record_type")
            params["record_type"] = record_type
        if date_from:
            clauses.append("knowledge_record.created_date >= :date_from")
            params["date_from"] = date_from
        if date_to:
            clauses.append("knowledge_record.created_date < :date_to + 1")
            params["date_to"] = date_to
        append_user_visibility_clause(clauses, params, auth_context, "knowledge_record.user_id")
        await append_requested_username_clause(connection, clauses, params, auth_context, username, "knowledge_record.user_id")
        where_sql = " where " + " and ".join(clauses) if clauses else ""
        from_sql = "from ai_qa_lib knowledge_record left join tk_users knowledge_user on knowledge_user.user_id = knowledge_record.user_id"
        await cursor.execute(f"select count(*), count(distinct trunc(knowledge_record.created_date)), min(trunc(knowledge_record.created_date)), max(trunc(knowledge_record.created_date)) {from_sql} {where_sql}", params)
        stats_row = await cursor.fetchone()
        evidence_sql = f"""select knowledge_record.id, knowledge_record.created_date, knowledge_record.blog_status, knowledge_record.topic_tag, null, knowledge_user.username, knowledge_record.question || '：' || dbms_lob.substr(knowledge_record.answer, 3000, 1) {from_sql} {where_sql} order by knowledge_record.created_date desc nulls last, knowledge_record.id desc fetch next 80 rows only"""
        await cursor.execute(evidence_sql, params)
        rows = [_evidence_row_to_dict(row) for row in await cursor.fetchall()]

        async def distribution(expression: str) -> dict[str, int]:
            await cursor.execute(f"select {expression}, count(*) {from_sql} {where_sql} group by {expression} order by count(*) desc fetch next 12 rows only", params)
            return _count_rows_to_dict(await cursor.fetchall())

        stats = {"matched_count": int(stats_row[0]) if stats_row else 0, "active_days": int(stats_row[1]) if stats_row else 0, "min_date": stats_row[2] if stats_row else None, "max_date": stats_row[3] if stats_row else None, "type_counts": await distribution("coalesce(knowledge_record.blog_status, '未标记')"), "week_counts": await distribution("coalesce(knowledge_record.topic_tag, '未标记')"), "learn_level_counts": {}}
        filters = {"keyword": keyword, "username": username, "type": record_type, "week": None, "day": None, "learn_level": None, "vector_status": None, "date_from": date_from, "date_to": date_to, "semantic_terms": [term["name"] for term in matched_terms]}
        return await _finalize_catalog_ask(connection=connection, question=question, filters=filters, stats=stats, rows=rows, evidence_sql=evidence_sql, params=params, selected_skills=selected_skills, matched_terms=matched_terms, execution_provider=execution_provider, model_name=model_name, domain={"code": "knowledge", "name": "可信知识", "description": "基于知识问答、来源、主题标签和发布状态。", "source_tables": ["AI_QA_LIB", "TK_USERS"]}, assistant_name="企业内部可信知识问数助手", semantic_label="命中的可信知识业务概念")


async def _ask_english_materials(
    question: str, *, skill_ids: list[str] | None, execution_provider: str, model_name: str, auth_context: AuthContext
) -> dict[str, Any]:
    selected_skills = get_prompt_skills(skill_ids or [], auth_context, agent_code="english-ask")
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        keyword = _extract_keyword(question)
        matched_terms = await find_matching_history_ontology_terms(connection, question, auth_context, "english_materials")
        semantic_keywords = list(dict.fromkeys(label for term in matched_terms for label in [term["name"], *term["aliases"]]))
        if matched_terms and not keyword:
            keyword = matched_terms[0]["name"]
        username = _extract_username(question, await _fetch_visible_usernames(cursor, auth_context))
        record_type = "已标记" if "已标记" in question else "未标记" if "未标记" in question else None
        clauses: list[str] = []
        params: dict[str, Any] = {}
        terms = list(dict.fromkeys(item for item in [keyword, *semantic_keywords] if item))
        if terms:
            expressions = []
            for index, value in enumerate(terms):
                bind_name = f"english_keyword_{index}"
                expressions.append(f"(lower(material.title) like '%' || lower(:{bind_name}) || '%' or lower(material.category) like '%' || lower(:{bind_name}) || '%' or lower(material.base_expression) like '%' || lower(:{bind_name}) || '%' or lower(material.professional_sentence) like '%' || lower(:{bind_name}) || '%' or lower(material.chinese_translation) like '%' || lower(:{bind_name}) || '%' or lower(material.full_script) like '%' || lower(:{bind_name}) || '%')")
                params[bind_name] = value
            clauses.append("(" + " or ".join(expressions) + ")")
        if record_type:
            clauses.append("material.is_flagged = :material_flag")
            params["material_flag"] = 1 if record_type == "已标记" else 0
        append_user_visibility_clause(clauses, params, auth_context, "material.user_id")
        await append_requested_username_clause(connection, clauses, params, auth_context, username, "material.user_id")
        where_sql = " where " + " and ".join(clauses) if clauses else ""
        from_sql = "from t_english material left join tk_users material_user on material_user.user_id = material.user_id"
        await cursor.execute(f"select count(*), count(distinct material.category) {from_sql} {where_sql}", params)
        stats_row = await cursor.fetchone()
        evidence_sql = f"""
            select material.english_id, null, case when material.is_flagged = 1 then '已标记' else '未标记' end, material.category, to_char(material.sequence_no), material_user.username,
                   coalesce(material.title, material.base_expression) || '：' || coalesce(material.professional_sentence, material.chinese_translation, material.full_script)
            {from_sql} {where_sql}
            order by material.english_id desc fetch next 80 rows only
        """
        await cursor.execute(evidence_sql, params)
        rows = [_evidence_row_to_dict(row) for row in await cursor.fetchall()]

        async def distribution(expression: str) -> dict[str, int]:
            await cursor.execute(f"select {expression}, count(*) {from_sql} {where_sql} group by {expression} order by count(*) desc fetch next 12 rows only", params)
            return _count_rows_to_dict(await cursor.fetchall())

        stats = {"matched_count": int(stats_row[0]) if stats_row else 0, "active_days": int(stats_row[1]) if stats_row else 0, "min_date": None, "max_date": None, "type_counts": await distribution("case when material.is_flagged = 1 then '已标记' else '未标记' end"), "week_counts": await distribution("coalesce(material.category, '未分类')"), "learn_level_counts": {}}
        filters = {"keyword": keyword, "username": username, "type": record_type, "week": None, "day": None, "learn_level": None, "vector_status": None, "date_from": None, "date_to": None, "semantic_terms": [term["name"] for term in matched_terms]}
        return await _finalize_catalog_ask(connection=connection, question=question, filters=filters, stats=stats, rows=rows, evidence_sql=evidence_sql, params=params, selected_skills=selected_skills, matched_terms=matched_terms, execution_provider=execution_provider, model_name=model_name, domain={"code": "english_materials", "name": "英语素材", "description": "基于英语表达、职业句式、中文翻译、分类和标记状态。", "source_tables": ["T_ENGLISH", "TK_USERS"]}, assistant_name="企业内部英语素材问数助手", semantic_label="命中的英语素材业务概念")


def _build_llm_prompt(
    *,
    question: str,
    filters: dict[str, Any],
    stats: dict[str, Any],
    evidence: list[dict[str, Any]],
    selected_skills: list[dict[str, str]] | None = None,
) -> str:
    evidence_lines = []
    for item in evidence:
        evidence_lines.append(
            f"- #{item['id']} | {item.get('history_date')} | {item.get('username') or '-'} | "
            f"{item.get('type') or '-'} | {item.get('week') or '-'} | {_trim_content(item.get('content'))}"
        )

    lines = [
            f"用户问题：{question}",
            f"识别条件：{_format_filter_summary(filters) or '未限定'}",
            f"匹配记录数：{stats['matched_count']}",
            f"活跃日期数：{stats['active_days']}",
            f"日期范围：{stats['min_date']} 至 {stats['max_date']}",
            f"类型分布：{stats['type_counts']}",
            f"周期分布：{stats['week_counts']}",
            f"学习等级分布：{stats['learn_level_counts']}",
            "记录摘录：",
            *evidence_lines,
        ]
    skill_instructions = _format_selected_skills_for_prompt(selected_skills or [])
    if skill_instructions:
        lines.extend(["", "已选择 Skill 指令：", skill_instructions])
    return "\n".join(lines)
