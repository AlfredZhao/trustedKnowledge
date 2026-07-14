# Regression Notes / 防回归记录

This file records bugs that were easy to reintroduce, especially when the fix depends on a non-obvious ordering, database driver behavior, or cross-module contract.
Use it as a checklist before changing nearby code.

## How to Add an Entry

When fixing a bug with meaningful regression risk, add a short entry with:

- Symptom: the user-visible failure or exact error.
- Trigger: the specific condition that exposes it.
- Root cause: the implementation mistake, not just the failing line.
- Safe pattern: the rule future changes must preserve.
- Guardrail: the test or verification that should fail if the bug returns.

Keep entries concrete. Prefer file paths, function names, SQL placeholders, and test names over broad advice.

## Oracle CLOB Input Sizes Must Match the SQL Being Executed

### Symptom

Todo edits failed with:

```text
Oracle rejected the todo update: DPY-4008: no bind placeholder named ":title" was found in the SQL text
```

### Trigger

Saving an existing Todo through `PATCH /todos/{todo_id}` after the backend introduced explicit Oracle CLOB binding for Todo `title` and `content`.

This could happen even when the final `update ai_todo_items` statement was valid, because the repository first executed a row-lock query:

```sql
select id
from ai_todo_items
where id = :todo_id ...
for update wait 5
```

That lock SQL does not contain `:title` or `:content`.

### Root Cause

`backend/app/repositories/todos.py:update_todo()` called `cursor.setinputsizes(title=..., content=...)` before executing the lock query.

With python-oracledb, input sizes configured on the cursor apply to the next execute call. If a configured bind name is absent from that SQL text, the driver rejects the statement with `DPY-4008`.

A partial earlier fix only reduced the declared fields to the payload fields. That still failed whenever the next SQL statement was the lock query and the payload included `title` or `content`.

### Safe Pattern

For dynamic SQL, call `setinputsizes()` only immediately before the SQL statement that contains those placeholders.

For Todo updates, preserve this order:

1. Execute the lock query with only lock parameters.
2. Confirm the row exists.
3. Call `_set_todo_lob_input_sizes(cursor, values.keys())`.
4. Execute the generated `update ai_todo_items` SQL.

Do not move `_set_todo_lob_input_sizes()` above the lock query.

### Guardrail

`backend/tests/test_todos.py` uses `FakeCursor.execute()` to raise an Oracle-like error when declared input sizes do not match the next SQL statement's placeholders.

Relevant test:

```text
python -m pytest backend/tests/test_todos.py
```

The test `test_update_todo_binds_only_lobs_present_in_sql` must continue to prove that Todo updates bind only CLOB fields present in the generated update SQL and do not leak those declarations into the lock query.
