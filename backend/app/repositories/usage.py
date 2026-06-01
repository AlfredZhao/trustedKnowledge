from typing import Any

from app.db.oracle import acquire_connection


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "sample_time": row[0],
        "used_amount": row[1],
        "total_budget": row[2],
        "remaining_budget": row[3],
        "budget_duration": row[4],
        "next_reset_at": row[5],
    }


async def list_llm_usage(*, limit: int) -> tuple[list[dict[str, Any]], int]:
    count_sql = "select count(*) from v_llm_usage"
    list_sql = """
        select
            sample_time,
            used_amount,
            total_budget,
            remaining_budget,
            budget_duration,
            next_reset_at
        from (
            select
                sample_time,
                used_amount,
                total_budget,
                remaining_budget,
                budget_duration,
                next_reset_at
            from v_llm_usage
            order by sample_time desc
            fetch next :limit rows only
        )
        order by sample_time
    """

    async with acquire_connection() as connection:
        cursor = connection.cursor()
        await cursor.execute(count_sql)
        count_row = await cursor.fetchone()
        total = int(count_row[0]) if count_row else 0

        await cursor.execute(list_sql, {"limit": limit})
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows], total
