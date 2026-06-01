import re
from collections import Counter
from datetime import date
from typing import Any

import oracledb

from app.db.oracle import acquire_connection


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


def _counter_to_dict(counter: Counter[str]) -> dict[str, int]:
    return dict(counter.most_common(12))


def _trim_content(value: str | None, limit: int = 260) -> str:
    if not value:
        return ""
    collapsed = re.sub(r"\s+", " ", value).strip()
    return collapsed if len(collapsed) <= limit else collapsed[: limit - 1] + "..."


def _build_fallback_answer(
    *,
    question: str,
    keyword: str | None,
    username: str | None,
    stats: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> str:
    subject = keyword or "该主题"
    user_text = f"{username} 的" if username else ""
    if stats["matched_count"] == 0:
        return f"未找到与 {user_text}{subject} 相关的历史记录。可以换一个关键词，或放宽用户、项目名称等条件再查询。"

    lines = [
        f"根据当前可检索的 t_history 记录，{user_text}{subject} 相关记录共 {stats['matched_count']} 条，覆盖 {stats['active_days']} 个活跃日期。",
    ]
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
    return "\n".join(lines)


async def ask_history(question: str) -> dict[str, Any]:
    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute("select distinct username from t_history where username is not null")
        users = [row[0] for row in await cursor.fetchall()]

        keyword = _extract_keyword(question)
        username = _extract_username(question, users)

        clauses: list[str] = []
        params: dict[str, Any] = {}
        if keyword:
            clauses.append("lower(content) like '%' || lower(:keyword) || '%'")
            params["keyword"] = keyword
        if username:
            clauses.append("lower(username) = lower(:username)")
            params["username"] = username

        where_sql = " where " + " and ".join(clauses) if clauses else ""
        stats_sql = f"""
            select
                count(*),
                count(distinct trunc(history_date)),
                min(trunc(history_date)),
                max(trunc(history_date))
            from t_history
            {where_sql}
        """
        evidence_sql = f"""
            select id, history_date, type, week, day, username, content
            from t_history
            {where_sql}
            order by history_date desc nulls last, id desc
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
            "type_counts": _counter_to_dict(Counter((row["type"] or "未分类") for row in rows)),
            "week_counts": _counter_to_dict(Counter((row["week"] or "未记录") for row in rows)),
            "learn_level_counts": {},
        }

        await cursor.execute(
            f"select learn_level, count(*) from t_history{where_sql} group by learn_level order by learn_level",
            params,
        )
        level_rows = await cursor.fetchall()
        stats["learn_level_counts"] = {
            "未记录" if row[0] is None else str(row[0]): int(row[1])
            for row in level_rows
        }

        fallback = _build_fallback_answer(
            question=question,
            keyword=keyword,
            username=username,
            stats=stats,
            evidence=rows,
        )
        llm_used = False
        warning = None
        answer = fallback

        if rows:
            prompt = _build_llm_prompt(question=question, keyword=keyword, username=username, stats=stats, evidence=rows[:16])
            system = (
                "你是企业内部工作记录问数助手。只能根据提供的统计数据和记录摘录回答。"
                "不要编造工时；如果没有工时字段，明确说明工作量按记录数、活跃日期和类型分布衡量。"
                "回答使用中文，结构清晰，先给结论，再给统计依据和代表性记录。"
            )
            try:
                await cursor.execute("select chat_llm(:prompt, :system) from dual", {"prompt": prompt, "system": system})
                llm_row = await cursor.fetchone()
                llm_answer = llm_row[0] if llm_row else None
                if llm_answer and not str(llm_answer).startswith(("HTTP异常", "API错误", "系统错误", "错误:")):
                    answer = str(llm_answer)
                    llm_used = True
                elif llm_answer:
                    warning = str(llm_answer)[:500]
            except oracledb.Error as exc:
                error = exc.args[0] if exc.args else exc
                warning = getattr(error, "message", str(exc))

    return {
        "answer": answer,
        "filters": {
            "keyword": keyword,
            "username": username,
        },
        "stats": stats,
        "evidence": rows[:12],
        "llm_used": llm_used,
        "warning": warning,
    }


def _build_llm_prompt(
    *,
    question: str,
    keyword: str | None,
    username: str | None,
    stats: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> str:
    evidence_lines = []
    for item in evidence:
        evidence_lines.append(
            f"- #{item['id']} | {item.get('history_date')} | {item.get('username') or '-'} | "
            f"{item.get('type') or '-'} | {item.get('week') or '-'} | {_trim_content(item.get('content'))}"
        )

    return "\n".join(
        [
            f"用户问题：{question}",
            f"识别条件：username={username or '未限定'}; keyword={keyword or '未限定'}",
            f"匹配记录数：{stats['matched_count']}",
            f"活跃日期数：{stats['active_days']}",
            f"日期范围：{stats['min_date']} 至 {stats['max_date']}",
            f"类型分布：{stats['type_counts']}",
            f"周期分布：{stats['week_counts']}",
            f"学习等级分布：{stats['learn_level_counts']}",
            "记录摘录：",
            *evidence_lines,
        ]
    )
