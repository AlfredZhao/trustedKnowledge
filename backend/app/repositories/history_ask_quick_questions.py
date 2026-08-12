from typing import Any

import oracledb

from app.repositories.users import AuthContext


class HistoryAskQuickQuestionNotFoundError(Exception):
    pass


class HistoryAskQuickQuestionConflictError(Exception):
    pass


class HistoryAskQuickQuestionLimitError(Exception):
    pass


_table_ready = False


async def ensure_history_ask_quick_questions_table(connection: oracledb.AsyncConnection) -> None:
    global _table_ready
    if _table_ready:
        return
    cursor = connection.cursor()
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_history_ask_quick_questions (
                    id number generated always as identity primary key,
                    owner_username varchar2(100) not null,
                    domain_code varchar2(30) default ''history'' not null,
                    question varchar2(1000) not null,
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp default systimestamp not null,
                    constraint ai_history_ask_quick_question_uk unique (owner_username, domain_code, question)
                )
            ';
        exception when others then if sqlcode != -955 then raise; end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate 'create index ai_history_ask_quick_question_owner_idx on ai_history_ask_quick_questions (owner_username, domain_code, updated_at desc)';
        exception when others then if sqlcode != -955 then raise; end if;
        end;
        """
    )
    _table_ready = True


def _owner(auth_context: AuthContext) -> str:
    return auth_context.username.strip()


def _to_item(row: Any) -> dict[str, Any]:
    return {"id": int(row[0]), "question": str(row[1]), "domain_code": str(row[2]), "created_at": row[3], "updated_at": row[4]}


async def list_history_ask_quick_questions(connection: oracledb.AsyncConnection, auth_context: AuthContext, domain_code: str) -> list[dict[str, Any]]:
    await ensure_history_ask_quick_questions_table(connection)
    cursor = connection.cursor()
    await cursor.execute(
        """
        select id, question, domain_code, created_at, updated_at
        from ai_history_ask_quick_questions
        where lower(owner_username) = lower(:owner_username)
          and domain_code = :domain_code
        order by updated_at desc, id desc
        fetch next 12 rows only
        """,
        {"owner_username": _owner(auth_context), "domain_code": domain_code},
    )
    return [_to_item(row) for row in await cursor.fetchall()]


async def create_history_ask_quick_question(connection: oracledb.AsyncConnection, payload: dict[str, Any], auth_context: AuthContext) -> dict[str, Any]:
    await ensure_history_ask_quick_questions_table(connection)
    cursor = connection.cursor()
    question = str(payload["question"]).strip()
    domain_code = str(payload["domain_code"])
    await cursor.execute(
        "select count(*) from ai_history_ask_quick_questions where lower(owner_username) = lower(:owner_username) and domain_code = :domain_code",
        {"owner_username": _owner(auth_context), "domain_code": domain_code},
    )
    count_row = await cursor.fetchone()
    if count_row and int(count_row[0]) >= 12:
        raise HistoryAskQuickQuestionLimitError("每个业务域最多维护 12 个快捷问题。")
    try:
        new_id = cursor.var(oracledb.NUMBER)
        await cursor.execute(
            """
            insert into ai_history_ask_quick_questions (owner_username, domain_code, question)
            values (:owner_username, :domain_code, :question)
            returning id into :new_id
            """,
            {"owner_username": _owner(auth_context), "domain_code": domain_code, "question": question, "new_id": new_id},
        )
        await connection.commit()
        item_id = int(new_id.getvalue()[0])
    except oracledb.IntegrityError as exc:
        await connection.rollback()
        raise HistoryAskQuickQuestionConflictError("该业务域已存在相同的快捷问题。") from exc
    await cursor.execute(
        "select id, question, domain_code, created_at, updated_at from ai_history_ask_quick_questions where id = :id and lower(owner_username) = lower(:owner_username)",
        {"id": item_id, "owner_username": _owner(auth_context)},
    )
    row = await cursor.fetchone()
    if row is None:
        raise HistoryAskQuickQuestionNotFoundError("快捷问题未找到")
    return _to_item(row)


async def update_history_ask_quick_question(connection: oracledb.AsyncConnection, item_id: int, payload: dict[str, Any], auth_context: AuthContext) -> dict[str, Any]:
    await ensure_history_ask_quick_questions_table(connection)
    cursor = connection.cursor()
    try:
        await cursor.execute(
            """
            update ai_history_ask_quick_questions
            set question = :question, updated_at = systimestamp
            where id = :id and lower(owner_username) = lower(:owner_username)
            """,
            {"id": item_id, "owner_username": _owner(auth_context), "question": str(payload["question"]).strip()},
        )
    except oracledb.IntegrityError as exc:
        await connection.rollback()
        raise HistoryAskQuickQuestionConflictError("该业务域已存在相同的快捷问题。") from exc
    if cursor.rowcount == 0:
        await connection.rollback()
        raise HistoryAskQuickQuestionNotFoundError("快捷问题未找到")
    await connection.commit()
    await cursor.execute("select id, question, domain_code, created_at, updated_at from ai_history_ask_quick_questions where id = :id", {"id": item_id})
    return _to_item(await cursor.fetchone())


async def delete_history_ask_quick_question(connection: oracledb.AsyncConnection, item_id: int, auth_context: AuthContext) -> None:
    await ensure_history_ask_quick_questions_table(connection)
    cursor = connection.cursor()
    await cursor.execute(
        "delete from ai_history_ask_quick_questions where id = :id and lower(owner_username) = lower(:owner_username)",
        {"id": item_id, "owner_username": _owner(auth_context)},
    )
    if cursor.rowcount == 0:
        await connection.rollback()
        raise HistoryAskQuickQuestionNotFoundError("快捷问题未找到")
    await connection.commit()
