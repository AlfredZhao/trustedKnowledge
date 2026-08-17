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

## 增强美化 Markdown 更新必须同步离线导出器

### Symptom

浏览器中的博客工厂“增强美化”预览或下载 HTML 已支持某种 Markdown 表现，但用户下载到 Mac 后通过 `scripts/export-enhanced-html.mjs` 导出的离线 HTML 显示不一致。

### Trigger

修改 `frontend/src/utils/markdown.ts` 的 `markdownToHtml()`、`inlineEnhancedClipboardStyles()`、URL 清理或占位符清理行为，却未同步离线脚本。

### Root Cause

离线导出器为支持本地图片转 base64，保留了一份独立的异步 Markdown 渲染实现；它不会自动复用前端函数。

### Safe Pattern

每次变更增强美化渲染能力时，同步更新 `scripts/export-enhanced-html.mjs` 的 Markdown 解析、增强内联样式和清理规则；图片读取可保持 Node 专属实现，但生成的 HTML 结构与样式必须对齐。

### Guardrail

运行 `node --check scripts/export-enhanced-html.mjs`，并使用包含围栏代码块、`$$\\frac{a}{b}=x^2$$` 和 H4 的 Markdown 调用脚本。导出 HTML 必须保留代码前导空格、包含公式卡片样式和 `<sup>2</sup>`；前端改动后同时运行 `cd frontend && npm run build`。

## Markdown 代码块不得在占位符清理时丢失缩进

### Symptom

Markdown 预览或 MetaWeblog HTML 转换中的围栏代码块失去 Python、YAML 等代码的前导缩进，嵌套层级难以辨认。

### Trigger

正文经过 `removeLeakedMarkdownCodePlaceholders()` 或后端 `remove_leaked_markdown_code_placeholders()` 后再渲染或发布。

### Root Cause

占位符清理在替换内部 `@@CODE...@@` 标记后，对整篇 Markdown 执行了连续空格压缩，连代码块中有语义的前导空格也被压成一个空格。

### Safe Pattern

仅替换占位符本身及其相邻的无效空白；不得对完整 Markdown 作通用连续空格归一化。围栏代码块内容必须逐字符传递给 `<pre><code>`。

### Guardrail

运行 `pytest backend/tests/test_metaweblog_media.py`。其中 `test_markdown_code_blocks_keep_leading_indentation_after_placeholder_cleanup` 必须确认 8 空格与 12 空格的代码行仍在 HTML 中；前端改动后还需运行 `cd frontend && npm run build`。

## MetaWeblog 新文章超时不得自动重试

### Symptom

博客工厂发布时偶发 `The write operation timed out`，网络恢复后重新发布可能成功。

### Trigger

目标博客响应慢、上传本地图片、或 XML-RPC 请求已写出但在接收响应前超过单次请求超时。

### Root Cause

`urllib.request.urlopen()` 曾固定使用 20 秒超时，且新文章发布在客户端超时后无法确认远端是否已经创建文章。对 `metaWeblog.newPost` 自动重试会造成重复文章风险。

### Safe Pattern

通过 `TRUSTED_KNOWLEDGE_META_WEBLOG_TIMEOUT_SECONDS` 配置每次 XML-RPC 请求的超时，默认 60 秒。记录方法名、目标主机、请求/响应大小和耗时，但绝不记录账号、密码或正文。`newPost` 超时时提示结果未知并要求先确认目标博客；不得自动重试。保持现有数据库行锁，除非先引入可持久化的发布中/idempotency 状态后再拆分远程调用与数据库事务。

### Guardrail

运行 `pytest backend/tests/test_metaweblog_media.py`；模拟 `URLError(TimeoutError(...))` 时，`metaWeblog.newPost` 必须抛出 `MetaWeblogTimeoutError` 且错误文案包含“发布结果可能未知”。确认日志包含方法、主机和耗时，而没有密码或 XML-RPC 正文。

## AI 问数 Skill 卡片必须在窄视口内收缩

### Symptom

手机 PWA 展开 AI 问数的“调用 Skill”后，Skill 卡片及其长文本越过右侧面板边界。

### Trigger

在窄视口中加载名称、描述或所有者名称较长的可调用 Skill。

### Root Cause

网格子项和卡片标题的 flex 子项没有 `min-w-0` 宽度收缩约束；无空格的长文本会以固有宽度撑大卡片。

### Safe Pattern

`HistoryAskPanel` 的 Skill 网格、卡片和标题 flex 子项均保持 `min-w-0`；卡片限制为 `max-w-full` 并裁剪溢出，长描述与元信息使用 `overflow-wrap:anywhere`。移动端单列，`sm` 起再切换双列。

### Guardrail

以 320px 和 375px 宽度打开 AI 问数并展开“调用 Skill”，使用超长无空格名称、描述和所有者名称验证：所有卡片、选中图标和文本均在面板内可见；再确认 `sm` 以上宽度仍为双列且点击选中正常。

## AI 问数持久化回答必须按当前响应结构恢复

### Symptom

手机 PWA 点击 AI 问数后整页白屏，而桌面浏览器可正常打开。

### Trigger

PWA 的 localStorage 中保留了业务域、查询审计字段加入前的 AI 问数回答，随后升级到会读取 `answer.domain` 和 `answer.filters.semantic_terms` 的前端版本。

### Root Cause

`readHistoryAskResponse()` 过去只验证 `answer` 为字符串，旧响应因此被断言为当前 `HistoryAskResponse`。渲染时访问缺失的嵌套字段会抛出未捕获异常。

### Safe Pattern

更新 AI 问数响应结构时，同步升级 UI 状态存储版本或显式迁移。恢复回答前必须验证当前渲染所需的嵌套对象和业务域；不兼容的历史回答返回 `null`。渲染层仍须对外部响应的可选嵌套字段使用安全访问。

### Guardrail

在移动宽度和桌面宽度下，向 `trustedKnowledge.uiState.v2` 写入一个仅含旧字段的 `historyAsk.answer`，再进入 AI 问数：页面必须显示“等待提问”而不能白屏。并确认新版本首次启动不读取 `trustedKnowledge.uiState.v1`。

## AI Coding Release Tag Must Remain a Confirmed, Fixed-Argument Operation

### Symptom

The AI Coding release control could publish or tag without an explicit confirmation, or could pass arbitrary shell arguments to the GitHub script.

### Trigger

Open `发布并打 Tag`, submit a malformed version, omit the exact `ok` confirmation, or attempt to send extra command-like text through the release request.

### Root Cause

A release action is materially broader than normal code sync: `scripts/commit-to-github.sh --version` rewrites the Changelog, stages all changes, commits, pushes, and creates a remote tag. Passing free-form commands or trusting only the client confirmation would bypass this safety boundary.

### Safe Pattern

`/api/system/github-release` accepts only `version` matching `X.Y.Z` and `confirm == "ok"`; `system.py` invokes `bash`, the fixed script path, `--version`, and the validated version as separate process arguments. Reuse the existing GitHub-operation lock and timeout. The UI must keep the confirm button disabled until the version is valid and the input is exactly `ok`.

### Guardrail

Verify that `POST /api/system/github-release` rejects invalid versions and any confirmation other than `ok`, and that a valid request invokes only `bash scripts/commit-to-github.sh --version X.Y.Z`. In the UI, check desktop and mobile: the dialog opens with the suggested patch version, and the action remains disabled until `ok` is entered.

## Blog Factory List Titles Must Follow Edited Content Without Rewriting Source Snapshots

### Symptom

After changing a task's Markdown H1, the Blog Factory list continued to show the old source question, making it appear that the saved edit had failed.

### Trigger

Edit and save a Blog Factory task whose Markdown starts with a different H1 than its `question_snapshot`.

### Root Cause

The task editor persists `task_content`, while the list rendered only `question_snapshot`, which is intentionally retained as the immutable source-processing prompt.

### Safe Pattern

In `BlogFactoryRecords`, render list titles in this order: `article_title`, Markdown H1 from `task_content`, then the labeled `question_snapshot`. Do not overwrite the source snapshot merely to update a presentation title.

### Guardrail

Manually save a changed H1 and confirm the desktop and mobile list immediately shows it after the request succeeds. Also verify a task without an article title or H1 shows `原始问题：…`, and that publishing/source-trace data still uses the unchanged snapshot.

## Blog Factory Assist Saves Must Be Independent and Report on Their Buttons

### Symptom

Saving a manually edited summary or cover image could fail when unrelated task snapshots were empty. Chinese summaries could also exceed an Oracle 100-byte column despite meeting the UI's 100-character limit; a save on either button could also temporarily restyle or disable the other button.

### Trigger

Edit the assist summary to more than roughly 33 Chinese characters, or upload, replace, or remove a cover image on a task with an empty task body, question snapshot, or answer snapshot, then use either save action in `BlogFactoryRecords`.

### Root Cause

Both buttons invoked the full-task `onSaveItem()` path, which validates all task fields before it makes a request. The `assist_summary varchar2(100)` Oracle migration used byte semantics while the UI/API use a 100-character limit. The buttons also rendered their transient labels and disabled state from the shared `isItemSaving` flag; concurrent partial-update responses could overwrite each other's local field.

### Safe Pattern

In `frontend/src/App.tsx`, route assist saves through `handleSaveBlogFactoryAssistMetadata()` and submit only `assist_summary` or `cover_image_markdown`. Keep the Oracle column as `varchar2(100 char)`. `handleSaveAssist()` must retain status and timeout state per target, and each PATCH response must merge only its own metadata field into local state. Disable only the source assist action while it is in flight; full-task actions remain guarded until assist saves finish.

### Guardrail

Manually verify summary and cover saves at desktop and mobile widths in dark and light themes, including a record with a blank snapshot: each button changes only itself to `保存中`, then `已保存` or `保存失败`, without restyling the other button. Trigger both saves before either response returns and confirm both saved fields remain displayed; re-clicking the same button during its request must not issue a duplicate PATCH.

## Markdown Toolbar Must Toggle Without Crossing a Selected Line Boundary

### Symptom

In the trusted-knowledge and Todo editors, clicking a Markdown shortcut twice could add another wrapper instead of removing the existing one. Applying a heading to a selected line that included its terminating newline could also prefix the following line.

### Trigger

Select content, apply a heading/list/inline-code/code-block/HTML-comment shortcut, and apply the same shortcut again. For the line-boundary case, select a line including its trailing newline before applying H1, H2, or H3.

### Root Cause

`MarkdownImageTextarea` previously treated every shortcut as a one-way insertion. It also used the raw textarea selection end for line replacements; a browser selection ending immediately after `\n` was therefore treated as including the next line's start.

### Safe Pattern

In `frontend/src/App.tsx`, preserve a line selection's terminal newline outside `applyLineFormat()` replacements. For each toggleable shortcut, recognize both a selection containing the Markdown wrapper and the internal selection that the shortcut leaves between wrapper markers, then replace the full wrapper range when removing it.

### Guardrail

Manually verify in both the trusted-knowledge and Todo editors, at desktop and mobile widths:

1. Apply and reapply each heading level, each list type, inline code, code block, and HTML comment; the second action must restore the original text.
2. Select one visible line including its ending newline, apply a heading, and confirm the following line is unchanged.
3. Check dark and light themes: toolbar buttons, hover/focus indication, and disabled state must remain legible and reachable after wrapping.

## Markdown Table and Ordered-List Shortcuts Must Preserve Their Toggle Semantics

### Symptom

In the trusted-knowledge and Todo editors, clicking `表格` a second time nested another table instead of undoing the selected table. Applying `编号` to multiple lines also gave every line the `1.` marker.

### Trigger

Use `表格`, keep its automatically selected output, then click `表格` again; or select two or more non-empty lines and click `编号`.

### Root Cause

`insertTable()` treated table Markdown as ordinary selected text on every invocation, while `applyLineFormat()` reused its fixed ordered-list prefix for each line.

### Safe Pattern

In `frontend/src/App.tsx`, detect the toolbar's complete table selection (header, separator, and pipe-delimited body) before inserting a new table; convert its body’s first column back to plain lines. When applying `1. ` to multiple lines, generate the list marker from a counter that advances once per non-empty line.

### Guardrail

Manually verify in both the trusted-knowledge and Todo editors: selecting `甲` and `乙` then clicking `编号` produces `1. 甲` and `2. 乙`; click `表格` twice without changing the automatically selected output and confirm the second click restores the source lines rather than adding a nested table.

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

Verify Knowledge Factory with a selected item at desktop `xl` width and on a narrow mobile viewport: model, Skill, and `生成结果` must remain reachable, in order, and fully inside the source panel. Repeat after selecting `其他模型`.

## Knowledge Factory Other Model Must Reuse AI Ask Configuration

### Symptom

Choosing the AI Ask / other-model option in Knowledge Factory still attempted a Codex CLI call with `--model deepseek-chat`, so the separately configured OpenAI-compatible Base URL and API Key were ignored.

### Trigger

Enable an AI 问数 model configuration and select `其他模型` before generating a Knowledge Factory result.

### Root Cause

Both UI choices were resolved only to a model-name string and submitted through the Codex job endpoint, which has no access to the AI 问数 provider configuration.

### Safe Pattern

Keep one `其他模型` option and submit it with execution provider `history_ask_llm`. The backend must load the enabled AI 问数 configuration and use its Base URL, configured model name, and server-side API Key for the OpenAI-compatible request. Codex presets must remain on the `codex` provider path.

### Guardrail

Verify the Knowledge Factory request body uses `execution_provider: "history_ask_llm"` for `其他模型`, and unit-test that the provider job calls `_call_history_ask_llm` with the enabled configuration rather than spawning Codex.

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

## Oracle Dynamic DDL Defaults Must Escape Nested Quotes

### Symptom

Opening AI 问数业务概念 failed with `ORA-06550` / `PLS-00103` mentioning `PERSONAL`.

### Trigger

The ontology table already exists and the application attempts to add the newer `visibility` or `shared_with_json` columns.

### Root Cause

The migration used `execute immediate '...'` but embedded the default literals as single-quoted values. Oracle ended the dynamic SQL string before `PERSONAL` or `[]`.

### Safe Pattern

Within an Oracle dynamic SQL string, escape every literal quote again: use `default ''PERSONAL''` and `default ''[]''` in the PL/SQL source so the executed DDL receives `default 'PERSONAL'` and `default '[]'`.

### Guardrail

Review every `execute immediate` statement that contains text defaults. Existing-table migrations must be exercised, not just the fresh-table `create table` path.

## LLM Usage Ready Time Must Equal Reset Time

### Symptom

When the current-cycle budget was exhausted, `NEXT_CYCLE_READY` appeared one hour later than `NEXT_RESET_AT`.

### Trigger

View `LLM 使用情况` with `remaining_budget = 0` and a valid `next_reset_at` value.

### Root Cause

The frontend correctly parsed the reset value as UTC and displayed it in `Asia/Shanghai` (UTC+8), but then added an unrelated one-hour ready-time buffer.

### Safe Pattern

Treat `NEXT_RESET_AT` as the exact availability time. `getResetReadyAt()` may validate the value but must not add a delay or apply another timezone conversion.

### Guardrail

For a reset timestamp such as `2026-08-12T00:00:00Z`, verify both `NEXT_RESET_AT` and `NEXT_CYCLE_READY` render as `08-12 08:00` in Shanghai time and have the same countdown.
