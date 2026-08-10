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

## Knowledge Factory Action Bar Must Wrap Within Its Source Panel

### Symptom

The `生成结果` button in the Knowledge Factory source-context action bar extended beyond the panel boundary on desktop browsers.

### Trigger

At the `xl` layout, the center panel can be as narrow as 440px while the execution-model and Skill controls use their desktop widths. Forcing all controls and the action button onto one line exceeds the panel's usable width.

### Root Cause

`frontend/src/App.tsx` applied `xl:flex-nowrap` and an `xl:w-auto` width override to the action bar, preventing its controls from wrapping inside the constrained center column.

### Safe Pattern

Keep action groups inside narrow grid columns as `min-w-0` wrapping flex containers. Do not force a one-line desktop layout unless the column's minimum width reserves space for every control and action. Let the heading and action bar stack when they cannot safely share a row.

### Guardrail

Verify Knowledge Factory with a selected item at desktop `xl` width and on a narrow mobile viewport: model, Skill, and `生成结果` must remain reachable, in order, and fully inside the source panel. Repeat with the custom-model input visible.

## AI Usage Stable Samples Must Not Depend on Reset Timestamp Strings

### Symptom

The AI Usage sidebar expanded every recent sample as a separate row even when the visible usage values had not changed, instead of showing one folded time range with `合并 N 个采样`.

### Trigger

`v_llm_usage` returns consecutive samples with identical `used_amount`, `total_budget`, `remaining_budget`, and `budget_duration`, but `NEXT_RESET_AT` differs by timestamp precision, seconds-level drift, timezone serialization, or null/string formatting.

### Root Cause

`frontend/src/utils/appUtils.ts:collapseStableUsageSamples()` treated `next_reset_at` as part of `isSameUsageSnapshot()`. That field is used for reset display, not for deciding whether the usage snapshot changed, so harmless reset timestamp differences split otherwise stable periods.

### Safe Pattern

Keep stable-sample folding based on usage state only: `used_amount`, `total_budget`, `remaining_budget`, and `budget_duration`. The folded item may keep the newest sample's `next_reset_at` for display, but `next_reset_at` must not determine whether a stable usage period is split.

### Guardrail

When changing `collapseStableUsageSamples()` or the LLM usage API shape, verify with consecutive samples whose usage numbers are unchanged but `next_reset_at` strings differ. The result should be one folded item with `sample_count > 1` and a period spanning the first through last sample.

## Blog Factory Quick-Action Scrolling Must Follow the Current Detail Request

### Symptom

After switching Blog Factory tasks, `提取摘要` or `生图提示词` could fail to reach the content-assist area, or show the default summary view instead of the requested image-prompt view. Refreshing sometimes made the issue disappear.

### Trigger

Select one Blog Factory task and immediately select another, then use either task-content quick action while the detail request is still in flight.

### Root Cause

The original quick action used one `requestAnimationFrame()` to scroll immediately, without waiting for the selected task's asynchronous detail load and draft reset to finish. In parallel, `handleSelectBlogFactoryItem()` accepted every `getBlogFactoryItem()` response, so a slower request for a previously selected task could overwrite the current selection and invalidate the scroll target.

### Safe Pattern

Keep the queued assist target as `{ itemId, view }`. Execute its scroll only after `isDetailLoading` is false and the currently selected item still has that `itemId`; otherwise discard it. Resolve the target from the clicked button's own `[data-blog-factory-item-id]` container instead of a shared detail ref, and only cancel a scheduled scroll when a newer action or task selection increments `contentAssistScrollRequestRef`—never when clearing the queue state itself. Also increment `blogFactoryDetailRequestRef` on every task selection and apply detail results, errors, and loading completion only when their request ID is still current.

### Guardrail

Manually verify on desktop and mobile:

1. Select task A, immediately select task B, then click `提取摘要` and confirm the B content-assist card becomes visible.
2. Repeat with `生图提示词` and confirm the B prompt panel is selected.
3. Throttle the detail API or rapidly alternate A/B; a late A response must not replace B in the detail panel.

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

## Personal Secrets Optional Password Must Stay Nullable End to End

### Symptom

Creating a Personal Secrets entry from `个人机密 -> 新增` failed or stayed disabled when the username or password field was empty.

### Trigger

Saving a new secret with a system name but without a username, password, or both.

### Root Cause

The frontend save guard required `personalSecretDraft.password.trim()`, the Pydantic create schema required a non-blank `password`, and the Oracle table definition kept `password_cipher` and `password_nonce` as `not null`. These layers made the field effectively required even though the UI needs to support records without credentials.

### Safe Pattern

Only `system_name` is required for Personal Secrets. Preserve the same optional contract across:

- `frontend/src/App.tsx` save enablement and handler guards.
- `frontend/src/api/personalSecrets.ts` payload normalization.
- `backend/app/schemas/personal_secrets.py` create/update validation.
- `backend/app/repositories/personal_secrets.py` table setup and encrypted field writes.

Do not use placeholder encrypted password values to satisfy a database constraint; empty passwords should be stored as `null` cipher and nonce values so `has_password` remains false.

### Guardrail

`backend/tests/test_personal_secret_schemas.py` covers missing and blank username/password values for create, password clearing for update, and the continued requirement that `system_name` cannot be blank.

## Blog Factory Send-Back Must Preserve Ownership and Avoid Reusing the Source Knowledge

### Symptom

A pending Blog Factory result sent back for reprocessing could either disappear from the wrong user's queue, overwrite the original trusted knowledge, or re-enter Knowledge Factory with the original source text instead of the current factory result.

### Trigger

Using `发回知识加工` from a Blog Factory task whose current `任务内容` has been edited or belongs to a child/visible user rather than the logged-in operator.

### Root Cause

The Blog Factory task stores both the original knowledge snapshots and the generated task content. Reusing the old source knowledge status would expose the original answer to Knowledge Factory, not the current generated result. Creating the new knowledge on the frontend would also lose the factory row's `user_id` when an admin or parent user is operating on another visible user's task.

### Safe Pattern

Keep the send-back operation in the backend transaction:

1. Lock and visibility-check the `ai_blog_factory` row.
2. Require `factory_status = '待处理'`.
3. Insert a new `ai_qa_lib` row with `blog_status = '未发布'`, `answer = task_content`, and `user_id` copied from the factory row.
4. Persist the current factory draft fields and mark the factory task as `跳过`.

Do not update the original source knowledge in place for this workflow.

### Guardrail

`backend/tests/test_conversions.py` covers `send_blog_factory_item_to_processing()` inserting into `ai_qa_lib` with the factory row's `user_id`, using the current task draft as the new knowledge answer, marking the factory task as `跳过`, and refusing non-`待处理` tasks.
