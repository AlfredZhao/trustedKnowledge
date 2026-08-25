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

## Shared Baseline: Oracle Bind Isolation

All Oracle executions must receive only bind names present in that statement's SQL text. In multi-step repository flows, keep row-lock/read, update, count, and vector-query parameter dictionaries and `setinputsizes()` calls separate; do not let business-field binds or CLOB declarations leak into a preceding `SELECT ... FOR UPDATE` or summary query. Add or retain a regression test whenever dynamic SQL bindings change. Module-specific `DPY-4008` incidents below document concrete triggers and guardrails.

## Web Codex 任务不能等待终端审批

### Symptom

浏览器发起的 AI 编程任务长时间显示运行中，用户无法得知任务是否在等待 SQLcl、服务控制或其他命令的交互确认，最终可能只看到超时。

### Trigger

后端以非交互 `codex exec` 启动任务，stdin 在写入初始 prompt 后关闭，而 Codex 或子命令尝试请求人工审批/输入。

### Root Cause

浏览器任务没有终端 TTY，也没有把 Codex 审批协议桥接为前端确认操作；若允许任务尝试高风险外部命令，用户无法回答确认提示。

### Safe Pattern

`backend/app/api/codex.py:_build_prompt()` 必须明确禁止 Web Codex 直接执行 SQLcl/数据库、服务控制、Git 发布推送和需要确认的命令，并要求报告命令与前置条件。`CodexJobState.last_activity_at` 与 `last_event` 必须随 stdout/stderr 事件更新，前端在 60 秒无活动时显示可终止的风险提示。不要为消除卡住而使用绕过审批和沙箱的参数。

### Guardrail

运行 `python -m unittest tests.test_codex_jobs`，确认审批事件会呈现“Web 任务无法响应交互确认”的提示；检查 AI 编程页面在无新活动 60 秒后显示警告和“终止当前任务”按钮。验证桌面/移动与深浅主题，并运行 `cd frontend && npm run build`。

## Skill 删除必须使用应用内确认弹窗

### Symptom

在 Skill 管理中删除用户自建 Skill 时，浏览器显示原生系统确认框，外观和交互与应用不一致。

### Trigger

选中一个当前用户可删除的 Skill，并点击详情区的“删除 Skill”。

### Root Cause

`frontend/src/App.tsx:handleDeleteSelectedSkill()` 直接调用了 `window.confirm()`，绕过了其他模块共用的 `AppConfirmDialog`。

### Safe Pattern

删除动作先把目标保存到独立的删除目标 state，再用 `AppConfirmDialog` 请求确认；只有确认回调才能调用删除 API。删除进行中必须禁用关闭和重复提交。

### Guardrail

在 Skill 管理选择可删除 Skill 后点击删除，确认不出现浏览器原生对话框，而是显示“确认删除 Skill”应用内弹窗；取消不发请求，确认后列表和已选 Skill 均更新。分别检查桌面/移动宽度及深色/浅色主题，并运行 `cd frontend && npm run build`。

## SKILL.md 字符统计必须匹配调用截断规则

### Symptom

用户在 Skill 管理中编辑或新建 `SKILL.md` 时不知道 AI 只会使用前 6,000 个字符，导致末尾规则保存后未生效。

### Trigger

在 `SKILL.md` 编辑器或新建自定义 Skill 内容输入框中输入接近或超过 6,000 个 Unicode 字符。

### Root Cause

后端 `get_prompt_skills()` 使用 Python `skill_markdown[:6000]` 截断提示词，但前端此前没有显示对应的实时长度和截断状态。

### Safe Pattern

`frontend/src/App.tsx:SkillPromptCharacterNotice` 必须通过 `Array.from(content).length` 统计 Unicode 码位，不能用 JavaScript `content.length`；超过限制只警告、不阻止保存。统计仅适用于 `SKILL.md`，其它 Skill 文件不应误标为调用内容。

### Guardrail

分别在新建输入框和已选 `SKILL.md` 文件编辑器输入 5,999、6,000、6,001 个字符，确认前两者显示剩余字符，后者显示“调用时仅使用前 6,000 字符”，且三种内容均可保存。验证中英文、换行和 emoji 输入，检查桌面/移动及深浅主题，并运行 `cd frontend && npm run build`。

## 三个 AI 模块的 Skill 选择范围必须一致

### Symptom

知识加工、英语素材 AI 生成和 AI 问数显示的 Skill 范围或选择交互不一致，或默认直接暴露其他用户共享的 Skill。

### Trigger

在任一模块打开“选择 Skill”，并切换“全部 Skill”；随后取消勾选或切换到另一个 AI 模块。

### Root Cause

三个模块曾复用一个全局 `scope=callable` 的列表请求，但各自维护独立的下拉框、卡片选择与筛选逻辑，导致范围和后续修改难以同步。

### Safe Pattern

三个模块都必须复用 `frontend/src/App.tsx:SkillSelector`。默认请求 `scope=owned` 且 `enabled=true`；只有用户主动勾选“全部 Skill”才请求 `scope=callable`。两个范围分别缓存；切换期间不得清空当前卡片或以整块 loading 替换内容，只能在选择器内部显示轻量状态。回到默认范围后，所选 ID 必须限定为本次 `owned` 响应中的项目。

### Guardrail

分别在知识加工、英语素材 AI 生成和 AI 问数验证：初始只显示自己的启用 Skill；勾选“全部 Skill”才出现当前用户有权限调用的共享 Skill；取消勾选会移除已选共享 Skill。首次切换仅显示选择器内的轻量 loading，现有卡片与模块其它按钮不应塌缩或位移；重复切换应命中缓存。知识加工仍最多选择一个，AI 问数仍最多选择 8 个。检查桌面/移动和深浅主题，并运行 `cd frontend && npm run build`。

## AI 编程终态任务必须都可手工清理展示

### Symptom

AI 编程任务失败或由用户终止后，错误信息和输出持续显示，只有提交新任务后才会从页面中消失。

### Trigger

最近一条 `AiCodingMessage` 的状态为 `failed` 或 `cancelled`，且任务未生成完整的 `response`。

### Root Cause

`handleClearCodexMessageDisplay()` 曾只接受带 `response` 的完成任务；失败和终止卡片也没有触发该处理器的按钮，导致已存在的 `isDisplayCleared` 持久化状态无法用于这些终态。

### Safe Pattern

所有不再运行的 AI 编程任务卡片都应提供同一类手工清理操作，并仅把对应消息标为 `isDisplayCleared`；不得删除任务记录或改变后端 job 状态。

### Guardrail

在 AI 编程页面分别构造无 `response` 的 `failed` 与 `cancelled` 最新消息，确认两者均显示“清理结果”；点击后应显示等待任务空状态，刷新页面后仍保持隐藏。运行 `cd frontend && npm run build`。

## 英语素材脚本更新不得将业务绑定传给行锁 SQL

### Symptom

编辑英语素材并同时保存脚本和序号时失败，Oracle 返回 `DPY-4008: no bind placeholder named ":sequence_no" was found in the SQL text`。

### Trigger

`PATCH /english-materials/{material_id}` 的请求同时包含 `full_script` 与 `sequence_no`。更新脚本前，仓储会读取并锁定旧脚本以决定是否标记向量待更新。

### Root Cause

`backend/app/repositories/english_materials.py:update_english_material()` 将完整更新参数字典传给 `select full_script ... for update`。锁定 SQL 只包含 `:material_id` 和可见用户绑定，不包含业务字段绑定；python-oracledb 会拒绝多余绑定。

### Safe Pattern

为锁定查询创建独立的 `lock_params` 与 `clauses`，仅包含该查询的占位符；为最终 `UPDATE` 保留包含业务字段的 `params` 和 `update_clauses`。动态 SQL 的每次执行都必须只接收该 SQL 文本出现的绑定参数。

### Guardrail

运行 `python -m pytest backend/tests/test_english_materials.py`。`test_update_with_script_uses_only_lock_query_bind_parameters` 必须验证锁定查询不接收 `sequence_no`，而更新 SQL 仍正确接收该字段。

## Oracle 更新流程的每条 SQL 必须使用独立且精确的绑定参数

### Symptom

博客工厂编辑已有任务时保存失败，Oracle 返回 `DPY-4008: no bind placeholder named ":task_content" was found in the SQL text`。

### Trigger

`PATCH /blog-factory/{item_id}` 同时更新 `task_content` 与任意其它可编辑字段。为比较旧正文并标记向量待更新，仓储会先执行 `select task_content ... for update`。

### Root Cause

`backend/app/repositories/blog_factory.py:update_blog_factory_item()` 将包含更新业务字段的 `params` 直接传给行锁 SQL；该 SQL 只有 `:item_id` 和可见用户占位符，并不包含 `:task_content` 或其它更新字段。python-oracledb 会拒绝多余绑定。

### Safe Pattern

动态更新流程中，每次 `execute()` 均建立或使用仅包含该 SQL 文本所需占位符的参数字典。行锁查询使用 `lock_params` / `lock_clauses`，最终 `UPDATE` 使用包含业务字段的 `params` / `update_clauses`；计数、摘要和向量查询也遵循同一规则。不要为方便而复用跨语句的完整参数字典。

### Guardrail

运行 `python -m pytest backend/tests/test_blog_factory_bindings.py`。`test_update_with_task_content_uses_only_lock_query_bind_parameters` 必须验证锁定查询不接收 `task_content` 或其它业务字段，而最终更新仍接收它们。

## 英语素材迁移后 identity 必须越过已有 ID

### Symptom

新增英语素材失败，Oracle 返回 `ORA-00001`，并指出 `T_ENGLISH.ENGLISH_ID` 的已有值（例如 `1`）重复。

### Trigger

将带有显式 `ENGLISH_ID` 的历史英语素材迁入 `T_ENGLISH` 后，identity 生成器仍从迁移前的低值开始分配新 ID。

### Root Cause

`ENGLISH_ID` 定义为 `GENERATED BY DEFAULT AS IDENTITY`，允许迁移保留原 ID；但 Oracle 不会因显式插入而自动推进 identity 的下一值。

### Safe Pattern

在 `ensure_user_schema_for_connection()` 中，对 `T_ENGLISH.ENGLISH_ID` 确认为 identity 列后执行 `ALTER TABLE ... MODIFY ... START WITH LIMIT VALUE`，让下一个默认值大于表内最大 ID。不得用 `MAX(id) + 1` 在应用插入 SQL 中自行分配主键。

### Guardrail

运行 `python -m pytest backend/tests/test_english_materials.py`。`test_identity_migration_advances_past_explicitly_migrated_ids` 必须验证 startup migration 包含 `START WITH LIMIT VALUE`，并确认非 identity 列不会执行该 DDL。

## 近似检索绑定参数不得泄漏到统计 SQL

### Symptom

历史查询执行近似搜索时失败，并显示：`DPY-4008: no bind placeholder named ":semantic_query" was found in the SQL text`。

### Trigger

在 History Explorer 提交 `semantic_query`；`list_history()` 会先执行总数和日期摘要 SQL，再执行包含 `vector_embedding(... :semantic_query ...)` 的结果 SQL。

### Root Cause

`backend/app/repositories/history.py:list_history()` 将 `semantic_query` 放进了所有筛选 SQL 共用的参数字典，但计数与摘要 SQL 只需要相同的过滤条件，并不包含该占位符。python-oracledb 会拒绝多余绑定。

### Safe Pattern

让通用筛选参数只包含实际出现在 `where_sql` 中的占位符；仅在构造并执行含 `vector_embedding(BGE_BASE using :semantic_query as data)` 的 `list_sql` 时，向 `list_params` 追加 `semantic_query`。

### Guardrail

运行 `python -m pytest backend/tests/test_history.py`。测试必须验证近似搜索的计数和摘要 SQL 不接收 `semantic_query`，而结果 SQL 会接收它。

## Markdown 词内下划线不得误渲染为斜体

### Symptom

Markdown 预览、富文本复制或增强 HTML 导出会将变量名、路径和文件名中的下划线片段渲染为斜体，例如 `v_needs_update`、`my_file_name.md`。

### Trigger

正文包含被字母、数字或下划线相邻包围的单下划线；同时内容又经过 `formatInlineMarkdown()` 解析。

### Root Cause

单下划线斜体正则只排除了相邻下划线，没有识别词内边界，因此把标识符中的 `_word_` 片段误当作 Markdown 斜体标记。

### Safe Pattern

在 `frontend/src/utils/markdown.ts` 和 `scripts/export-enhanced-html.mjs` 中，单下划线斜体的起止标记都必须不紧邻 Unicode 字母、数字或下划线；独立的 `_强调_` 仍应保留。两套解析规则必须同步修改。

### Guardrail

验证 `正常 _斜体_ 内容` 输出 `<em>斜体</em>`，并确认 `v_needs_update`、`my_file_name.md`、`src_app/main.ts` 与 `中文_不应斜体_文本` 保持原文；运行 `node --check scripts/export-enhanced-html.mjs`、用这些样例导出 HTML，并运行 `cd frontend && npm run build`。

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

## Markdown Toolbar Formatting Must Preserve the Long-Document Viewport

### Symptom

When a user applied a Markdown toolbar action to content near the bottom of a long editor, the editor could jump back to its first line even though the selected text was restored.

### Trigger

Scroll a trusted-knowledge, Todo, merge, Blog Factory, or task-content Markdown editor away from its first line, select visible text, then apply a toolbar format action or insert an image.

### Root Cause

`MarkdownImageTextarea` restored its selection after the controlled value update but did not retain the textarea scroll offsets. Browser focus and selection restoration may reset the native textarea viewport during that update.

### Safe Pattern

Capture `scrollTop` and `scrollLeft` before changing the controlled value. On the next animation frame, focus the textarea with `preventScroll`, restore the selection, and then restore both offsets. Keep this behavior in the shared `MarkdownImageTextarea` helper so every Markdown editor receives the same protection.

### Guardrail

At desktop and mobile widths, in dark and light themes, scroll each Markdown editor to a lower section and apply heading, list, inline-code, code-block, table, comment, and image-insertion actions. The formatted text and selection must remain correct, while both the editor viewport and page viewport stay at the current section.

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

## Markdown Line Selection and Horizontal Rule Rendering

### Symptom

Applying the Markdown `加粗` shortcut to a whole-line selection could place the closing `**` after the newline, preventing a later toggle-off. A standalone `---` line was shown as literal text in preview and rich-copy output.

### Trigger

Select a line whose textarea selection includes its trailing newline, then click `加粗`; or preview/copy a Markdown document containing a standalone `---`, `***`, or `___` line.

### Root Cause

`applyBold()` used the unnormalized textarea selection end, unlike the line-formatting actions. The shared `markdownToHtml()` parser did not recognize Markdown thematic-break syntax, so it fell through to paragraph rendering.

### Safe Pattern

Inline-format actions that wrap a line selection must exclude a trailing newline from the replacement range and preserve that newline after the closing marker. Keep thematic-break detection in the shared `markdownToHtml()` parser, before paragraph fallback, so preview and rich-copy use identical output; style the emitted `<hr>` through `.markdown-preview hr` with theme variables.

### Guardrail

Verify that selecting `文本\n` and toggling `加粗` produces `**文本**\n`, then restores `文本\n` on a second toggle. Verify standalone `---`, `***`, and `___` each produce an `<hr />` in `markdownToHtml()` and do not affect table delimiter parsing.
# Agent 范围必须在前后端同时生效

## 症状

用户在业务模块的 Skill 选择器中看到了无关 Skill，或通过修改请求的 `skill_ids` 绕过了界面限制。

## 触发条件

在知识加工、任一 AI 问数业务域、博客审阅、英语生成或英语补全中选择 Skill，或直接提交不属于当前 Agent 的 Skill ID。

## 根因

原有 Skill 可见性只按所有者、分享和启用状态判断，没有业务 Agent 上下文。

## 安全模式

前端 `SkillSelector` 必须携带 `agentCode` 请求列表；后端调用 `get_prompt_skills` 必须传入对应 `agent_code`，由 Agent 白名单再次过滤。

## 守护测试

为每个模块验证仅显示当前 Agent 的系统/个人 Skill、默认 Skill 自动选中、个人 Skill 不被其他用户看到；再以 API 提交越权 Skill ID，确认它不会进入提示词或执行结果。
