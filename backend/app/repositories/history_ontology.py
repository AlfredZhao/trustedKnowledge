import json
from typing import Any

import oracledb

from app.repositories.users import AuthContext


class HistoryOntologyNotFoundError(Exception):
    pass


async def ensure_history_ontology_table(connection: oracledb.AsyncConnection) -> None:
    cursor = connection.cursor()
    await cursor.execute(
        """
        begin
            execute immediate '
                create table ai_history_ontology_terms (
                    id number generated always as identity primary key,
                    owner_username varchar2(100) not null,
                    domain_code varchar2(30) default ''history'' not null,
                    name varchar2(100) not null,
                    aliases_json varchar2(2000) default ''[]'' not null,
                    description varchar2(1000),
                    created_at timestamp default systimestamp not null,
                    updated_at timestamp default systimestamp not null,
                    constraint ai_history_ontology_owner_domain_name_uk unique (owner_username, domain_code, name)
                )
            ';
        exception
            when others then
                if sqlcode != -955 then raise; end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate 'create index ai_history_ontology_owner_idx on ai_history_ontology_terms (owner_username, updated_at desc)';
        exception
            when others then
                if sqlcode != -955 then raise; end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate 'alter table ai_history_ontology_terms add domain_code varchar2(30) default ''history'' not null';
        exception
            when others then
                if sqlcode != -1430 then raise; end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate 'alter table ai_history_ontology_terms drop constraint ai_history_ontology_owner_name_uk';
        exception
            when others then
                if sqlcode != -2443 then raise; end if;
        end;
        """
    )
    await cursor.execute(
        """
        begin
            execute immediate 'alter table ai_history_ontology_terms add constraint ai_history_ontology_owner_domain_name_uk unique (owner_username, domain_code, name)';
        exception
            when others then
                if sqlcode not in (-2261, -955) then raise; end if;
        end;
        """
    )


def _owner(auth_context: AuthContext) -> str:
    return auth_context.username.strip()


def _normalize_aliases(values: list[str]) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = value.strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            unique.append(normalized[:100])
    return unique[:12]


def _to_term(row: Any) -> dict[str, Any]:
    try:
        aliases = json.loads(row[3] or "[]")
    except (TypeError, json.JSONDecodeError):
        aliases = []
    return {
        "id": int(row[0]),
        "name": str(row[1]),
        "aliases": _normalize_aliases(aliases if isinstance(aliases, list) else []),
        "description": str(row[4] or ""),
        "created_at": row[5],
        "updated_at": row[6],
        "domain_code": str(row[7] or "history"),
    }


async def list_history_ontology_terms(
    connection: oracledb.AsyncConnection, auth_context: AuthContext, domain_code: str = "history"
) -> list[dict[str, Any]]:
    await ensure_history_ontology_table(connection)
    cursor = connection.cursor()
    await cursor.execute(
        """
        select id, name, owner_username, aliases_json, description, created_at, updated_at, domain_code
        from ai_history_ontology_terms
        where lower(owner_username) = lower(:owner_username) and domain_code = :domain_code
        order by updated_at desc, id desc
        """,
        {"owner_username": _owner(auth_context), "domain_code": domain_code},
    )
    return [_to_term(row) for row in await cursor.fetchall()]


async def create_history_ontology_term(
    connection: oracledb.AsyncConnection, payload: dict[str, Any], auth_context: AuthContext
) -> dict[str, Any]:
    await ensure_history_ontology_table(connection)
    cursor = connection.cursor()
    name = str(payload["name"]).strip()
    aliases = _normalize_aliases(payload.get("aliases") or [])
    description = str(payload.get("description") or "").strip()
    term_id_var = cursor.var(oracledb.NUMBER)
    await cursor.execute(
        """
        insert into ai_history_ontology_terms (owner_username, domain_code, name, aliases_json, description)
        values (:owner_username, :domain_code, :name, :aliases_json, :description)
        returning id into :id
        """,
        {
            "owner_username": _owner(auth_context),
            "domain_code": str(payload.get("domain_code") or "history"),
            "name": name,
            "aliases_json": json.dumps(aliases, ensure_ascii=False),
            "description": description,
            "id": term_id_var,
        },
    )
    await connection.commit()
    term_id = int(term_id_var.getvalue()[0])
    return await get_history_ontology_term(connection, term_id, auth_context)


async def get_history_ontology_term(
    connection: oracledb.AsyncConnection, term_id: int, auth_context: AuthContext
) -> dict[str, Any]:
    await ensure_history_ontology_table(connection)
    cursor = connection.cursor()
    await cursor.execute(
        """
        select id, name, owner_username, aliases_json, description, created_at, updated_at, domain_code
        from ai_history_ontology_terms
        where id = :id and lower(owner_username) = lower(:owner_username)
        """,
        {"id": term_id, "owner_username": _owner(auth_context)},
    )
    row = await cursor.fetchone()
    if row is None:
        raise HistoryOntologyNotFoundError("未找到该业务概念")
    return _to_term(row)


async def update_history_ontology_term(
    connection: oracledb.AsyncConnection, term_id: int, payload: dict[str, Any], auth_context: AuthContext
) -> dict[str, Any]:
    await get_history_ontology_term(connection, term_id, auth_context)
    cursor = connection.cursor()
    await cursor.execute(
        """
        update ai_history_ontology_terms
        set domain_code = :domain_code, name = :name, aliases_json = :aliases_json, description = :description, updated_at = systimestamp
        where id = :id and lower(owner_username) = lower(:owner_username)
        """,
        {
            "id": term_id,
            "owner_username": _owner(auth_context),
            "domain_code": str(payload.get("domain_code") or "history"),
            "name": str(payload["name"]).strip(),
            "aliases_json": json.dumps(_normalize_aliases(payload.get("aliases") or []), ensure_ascii=False),
            "description": str(payload.get("description") or "").strip(),
        },
    )
    await connection.commit()
    return await get_history_ontology_term(connection, term_id, auth_context)


async def delete_history_ontology_term(connection: oracledb.AsyncConnection, term_id: int, auth_context: AuthContext) -> None:
    await get_history_ontology_term(connection, term_id, auth_context)
    cursor = connection.cursor()
    await cursor.execute(
        "delete from ai_history_ontology_terms where id = :id and lower(owner_username) = lower(:owner_username)",
        {"id": term_id, "owner_username": _owner(auth_context)},
    )
    await connection.commit()


async def find_matching_history_ontology_terms(
    connection: oracledb.AsyncConnection, question: str, auth_context: AuthContext, domain_code: str = "history"
) -> list[dict[str, Any]]:
    terms = await list_history_ontology_terms(connection, auth_context, domain_code)
    normalized_question = question.lower()
    matches = []
    for term in terms:
        labels = [term["name"], *term["aliases"]]
        matched_labels = [label for label in labels if label.lower() in normalized_question]
        if matched_labels:
            matches.append({**term, "matched_labels": matched_labels})
    return matches
