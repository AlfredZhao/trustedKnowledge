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

## 列表缓存不能阻止后台读取最新服务端结果

### Symptom

同一账号在桌面端和 PWA 使用相同筛选条件时，桌面端显示最新匹配记录，PWA 却显示此前缓存的 0 条或旧数量；重新打开 PWA 仍不更新。

### Trigger

某设备在 `localStorage` 中保存了某个列表查询路径的 GET 缓存，随后另一设备新增、更新或处理了匹配记录。

### Root Cause

列表加载 effect 将缓存命中视为最终结果并提前 `return`，从而跳过网络请求。缓存按设备和 API key 保存，本机写入时的失效不会传播到另一台设备。

### Safe Pattern

对会跨设备变动的列表，始终先渲染 `readCached*()` 返回的数据以缩短首屏时间，再继续执行对应 `fetch*()` 并在成功后用最新结果更新 UI 和缓存。缓存存在时不得显示阻塞加载态；请求失败时保留缓存。后台同步不得关闭详情/弹窗或覆写未保存草稿。博客工厂另保留不改变当前筛选和页码的 `刷新列表` 手工兜底。

### Guardrail

在 PWA 先以“Alfred + 已处理”等组合得到并缓存 0 条，再在另一设备创建或更新为匹配记录。重新进入该 PWA 页面应先显示缓存、随后自动更新为服务端结果；断网时仍显示缓存。检查知识库、知识加工、博客工厂、待办、个人机密、当前记录、英语素材、历史查询和 AI 用量，并在博客工厂打开编辑/发布弹窗后触发后台同步，确认弹窗、复制内容和未保存草稿均保持。另在总览缓存旧用量后产生新采样，重新进入总览应让 LLM 电池自动更新到与 AI 用量页相同的剩余额度百分比，无需手工刷新。运行 `cd frontend && npm run build`。

## 生图提示词预览必须跟随当前文章与摘要

### Symptom

任务详情更新文章标题或保存摘要后，生图提示词中的“标题”与“文章核心讲什么”仍显示旧问题快照或旧的自动提炼内容。

### Trigger

保存带一级标题的文章、更新文章标题或摘要，然后打开内容辅助的生图提示词预览。

### Root Cause

提示词函数调用把问题快照作为标题，并基于提示词输入/任务内容重新生成摘要，没有引用当前文章标题、当前摘要及已保存文章正文。

### Safe Pattern

`BlogFactoryRecords` 必须以 `publishTitle` 作为提示词标题、以 `editDraft.assistSummary` 作为优先核心内容、以 `selectedItem.article_markdown` 作为优先分析正文；临时输入框只覆盖正文来源。来源变化可以重算预览，但不可自动覆盖 `cover_prompt_snapshot`。

### Guardrail

保存一篇有 H1 的文章并保存摘要，确认预览中的标题和核心内容分别同步更新；修改临时输入正文后，标题和摘要仍保持当前文章/摘要。未点击保存提示词时导出仍保留旧快照。运行 `cd frontend && npm run build`。

## 博客工厂增强 HTML 必须只展示已保存生图提示词

### Symptom

增强美化导出无法携带确认过的生图提示词，或误把当前设备尚未保存的临时提示词、模板配置带入 HTML。

### Trigger

用户在内容辅助生成生图提示词、保存后导出，或在未保存提示词时导出同一任务。

### Root Cause

原生图提示词仅是浏览器基于本地配置即时计算的值，没有任务级持久化字段，导出无法区分临时预览和用户确认版本。

### Safe Pattern

`AI_BLOG_FACTORY.cover_prompt_snapshot` 使用 CLOB 保存已确认提示词；`BlogFactoryUpdate`、行映射、前端类型及增强导出均须传递该字段。只有点击 `保存提示词` 成功后的快照才可传入导出，HTML 使用独立 `data-tk-export-cover-prompt` 标记和复制按钮，正文复制必须移除该区块。

### Guardrail

生成后不保存即导出，不应出现提示词；点击保存后重新导出，应显示提示词与 `复制生图提示词`，且该按钮只复制提示词。修改本地模板或临时输入但不保存后再次导出，仍应保留原已保存快照。运行 `cd backend && python -m unittest tests.test_blog_factory_bindings` 与 `cd frontend && npm run build`。

## 博客工厂增强 HTML 必须只展示已保存摘要

### Symptom

“复制增强美化”下载的 HTML 没有摘要，或将尚未保存的摘要草稿带入导出；加入摘要后，“复制正文”又意外包含摘要文本。

### Trigger

对带有或不带有已保存 `assist_summary` 的博客工厂文章执行增强美化复制，并在下载后的 HTML 中点击复制按钮。

### Root Cause

增强 HTML 生成器原先只接收 Markdown 和标题，没有摘要输入或独立的摘要 DOM 标记，导致无法提供精准复制，也无法将正文复制范围与摘要分离。

### Safe Pattern

任务详情与已保存文章两条增强美化导出链路都必须把 `selectedBlogFactoryItem.assist_summary` 作为 `copyMarkdownAsEnhancedRichText()` 的 `summary` 选项传入。独立 HTML 在标题后、无标题时正文前插入带 `data-tk-export-summary` 的摘要卡片，并只在该内容存在时显示 `复制摘要`。`复制正文` 克隆文章时必须移除摘要卡片和代码块复制按钮。

### Guardrail

分别导出带已保存摘要、只有未保存摘要草稿、无摘要的文章。第一种应显示摘要及三个按钮，`复制摘要` 只复制摘要，`复制正文` 不含标题、摘要或代码按钮；后两种不得显示摘要或 `复制摘要`。运行 `cd frontend && npm run build`，并执行 `node scripts/export-enhanced-html.mjs --help`。

## 博客工厂摘要默认生成与换一条候选

### Symptom

博客工厂任务的内容辅助初始为空，用户必须先点击提取；再次点击仍得到同一句摘要，无法快速选择另一种表述。

### Trigger

打开没有已保存 `assist_summary` 的任务详情，或在当前摘要存在时点击摘要生成操作。

### Root Cause

`buildBlogFactoryTaskSummary()` 为确定性单结果函数，界面未在选择任务后填入默认候选，按钮每次只回填同一结果。

### Safe Pattern

使用 `buildBlogFactoryTaskSummaryCandidates()` 生成去重候选。任务切换后，仅在服务端摘要为空且摘要输入框尚为空时填入首个候选，绝不自动保存或覆盖用户已有输入；`换一条摘要` 必须选择与当前文本不同的下一个候选。没有第二个有效候选时禁用替换操作。

### Guardrail

打开包含至少两句有效内容的任务，摘要框应立即显示默认候选；连续点击 `换一条摘要` 应在不同候选间轮换。手工编辑、保存摘要、切换 PWA 前后台及后台列表同步后，现有摘要均不得被自动覆盖。对单句短内容，替换按钮应不可用。运行 `cd frontend && npm run build`。

## 英语素材详情必须在 PWA 回收后恢复到可复制状态

### Symptom

手机 PWA 从英语素材详情复制标题、切换到其它应用粘贴后，若系统回收后台 WebView，返回应用只显示英语素材列表，用户必须再次打开同一条详情才能复制翻译或脚本。

### Trigger

英语素材详情弹窗打开时，iOS 或 Android 回收后台 PWA 进程，随后通过应用图标或系统任务恢复。

### Root Cause

React state 会随 WebView 回收而丢失。原先 `trustedKnowledge.uiState.v2` 仅保存英语素材的 `selectedId`，没有保存详情打开状态；列表恢复后也不会主动读取该条详情。Service Worker 只能缓存应用壳和静态资源，不能保留 React 内存状态。

### Safe Pattern

`StoredUiState.englishMaterials` 必须同时保存 `selectedId` 和 `detailOpen`。`handleSelectEnglishMaterial()` 要在 state 更新前同步写入详情会话和 `english_material_id` URL 参数；启动时优先用 `readCachedEnglishMaterial()` 显示缓存详情，并在后台调用 `getEnglishMaterial()` 刷新。关闭详情或离开英语素材模块时必须清除 URL 参数。

### Guardrail

在手机宽度打开任一英语素材详情，依次点击“复制标题”、切到其它应用、模拟刷新或关闭后重新打开 PWA。应直接回到同一详情，缓存存在时“复制翻译”和“复制脚本”无需等待即可操作；断网时仍可显示缓存详情，联网后内容会后台更新。关闭详情后刷新应只停留在列表。检查深浅主题，并运行 `cd frontend && npm run build`。

## PWA 应用壳不能因慢网络无限阻塞启动

### Symptom

已安装的 PWA 从后台恢复或重新打开时，静态“加载中...”页面在网络可用但响应较慢的情况下停留超过一秒。

### Trigger

Service Worker 的 HTML `networkFirst()` 请求没有失败、但首字节迟迟未返回；设备已经具有可用的应用壳缓存。

### Root Cause

纯网络优先策略只会在请求失败后读取 Cache Storage，慢网络不会触发失败分支，因此错过了本可立即使用的缓存壳。

### Safe Pattern

`frontend/public/sw.js:networkFirst()` 必须在 `HTML_NETWORK_TIMEOUT_MS`（当前 450ms）后优先返回已缓存的同请求或 `/index.html` 回退壳，同时让未完成的网络请求继续写入缓存。缓存不存在时仍必须等待网络结果，不能把首次访问误判为离线。

### Guardrail

在已加载过一次 PWA 的移动设备上使用网络限速，重新打开应用应在约 450ms 后进入缓存壳；恢复正常网络后再次打开应获取新壳并更新缓存。清除站点缓存后首次访问仍须正常等待并完整加载。运行 `cd frontend && npm run build`。

## DeepSeek AI 审阅必须保持 JSON 契约与安全替换约束

### Symptom

博客工厂以 DeepSeek 审阅 `database security` 等内容时，无论是否选择 Skill，均提示“AI 审阅内容不符合预期格式，请重试”。

### Trigger

DeepSeek 返回可解析 JSON，但使用 `major`、`logic` 等英文枚举值，或将响应包在 `result` / `review` 对象内。

### Root Cause

`backend/app/repositories/blog_review.py` 将模型 JSON 直接交给使用中文 Literal 枚举的 `BlogFactoryReviewResult` 校验；任何等价但未逐字匹配的标签都会被统一包装为格式错误。Skill 只改变审阅侧重点，无法改变此校验链路。

### Safe Pattern

对 DeepSeek 调用 `response_format={"type": "json_object"}`，并仅在 `blog_review._normalize_review_result()` 中将已知等价标签及单层包装转换为契约值。只有 `before` 在原文中恰好出现一次且 `after` 非空的建议才能保留；不得为满足格式而编造替换建议或放宽唯一定位要求。

### Guardrail

运行 `cd backend && python -m unittest tests.test_blog_review`。`test_normalizes_deepseek_style_english_labels_and_issue_wrapper` 必须通过，且 `test_drops_non_unique_replacements_and_returns_a_valid_no_issue_result` 必须继续拒绝不安全替换。

## Web Codex 任务不能等待终端审批

### Symptom

浏览器发起的 AI 编程任务长时间显示运行中，用户无法得知任务是否在等待 SQLcl、服务控制或其他命令的交互确认，最终可能只看到超时。

### Trigger

后端以非交互 `codex exec` 启动任务，stdin 在写入初始 prompt 后关闭，而 Codex 或子命令尝试请求人工审批/输入。

### Root Cause

浏览器任务没有终端 TTY，也没有把 Codex 审批协议桥接为前端确认操作；若允许任务尝试高风险外部命令，用户无法回答确认提示。

### Safe Pattern

`backend/app/api/codex.py:_build_prompt()` 必须明确禁止 Web Codex 直接执行 SQLcl/数据库、服务控制、Git 发布推送和需要确认的命令，并要求报告命令与前置条件。`CodexJobState.last_activity_at` 与 `last_event` 必须随 stdout/stderr 事件更新，前端在 60 秒无活动时显示可终止的风险提示。不要为消除卡住而使用绕过审批和沙箱的参数。

## 知识加工不能继承 AI 编程的超长等待

### Symptom

知识加工页长期只显示“模型正在按所选 Skill 加工”，用户不能取消，也无法区分正常生成、外部等待和卡住；配置其他模型时，任务级等待还可能超过网络请求的单次 socket 超时。

### Trigger

Codex 子进程或 OpenAI 兼容模型迟迟不返回最终结果，或 Skill 指令过长使首次响应明显延迟。

### Root Cause

异步任务复用了 AI 编程的 900 秒预算，前端忽略了任务快照已有的活动字段；其他模型调用通过线程包装阻塞 HTTP，原先没有以任务总时限包裹。

### Safe Pattern

`output_mode="final"` 的知识加工任务必须使用 `TRUSTED_KNOWLEDGE_KNOWLEDGE_PROCESSING_TIMEOUT_SECONDS`（默认 180 秒），前端应显示已等待时间、最近活动和 60 秒无活动警示，并始终提供 `cancelCodexJob()` 取消入口。所选 Skill 注入必须传入 `knowledge_processing_skill_char_budget` 总预算；其他模型调用要由 `asyncio.wait_for()` 使用同一任务时限包裹。

### Guardrail

运行 `cd backend && python -m unittest tests.test_codex_jobs`，其中 `test_final_output_jobs_use_the_short_knowledge_processing_timeout` 与 `test_other_model_processing_job_stops_at_the_job_timeout` 必须通过；运行 `cd frontend && npm run build`，在桌面和手机宽度分别确认生成、60 秒无活动提示、取消、超时/失败和完成状态均可达且不被裁切。

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

## 下载的增强美化 HTML 代码块复制控件必须独立工作

### Symptom

博客工厂“增强美化”下载的独立 HTML 中，代码块复制按钮显示在代码块外，或点击后未只复制该代码块；使用“复制正文”时，功能按钮文字也被复制进正文。

### Trigger

共用 Markdown 渲染器为围栏代码块输出复制按钮，但独立 HTML 未同步注入该按钮的样式、点击处理，或正文复制未清理按钮。

### Root Cause

应用内 Markdown 预览由 React 点击委托和 `.markdown-preview` 范围 CSS 驱动；下载的 HTML 不加载应用样式或 React 事件处理器，却复用了相同的代码块标记。

### Safe Pattern

独立 HTML 必须为 `[data-copy-code-block]` 注入内联定位样式，并在用户点击时仅读取同一 `[data-code-block]` 下的 `code.textContent` 后执行纯文本复制及降级处理。复制正文前，应从文章克隆中移除所有 `[data-copy-code-block]`。

### Guardrail

生成含两个围栏代码块的增强美化下载 HTML。确认两个 `复制` 均位于各自代码块右上角，点击后仅得到对应源代码（保留换行和缩进），并确认“复制正文”的纯文本和富文本都不含 `复制` 按钮文字；运行 `cd frontend && npm run build`。

## Mermaid 图表与语法高亮必须保持源码回退和离线导出

### Symptom

` ```mermaid ` 在应用内预览或下载的增强 HTML 中仅显示为普通代码，或图表解析失败后吞掉原始内容；带 `bash`、`python`、`sql` 等语言标识的代码块无法区分关键字、字符串和注释。

### Trigger

用户在可信知识、知识加工、博客工厂、Todo、AI 问数或 AI 编程的 Markdown 预览中输入 Mermaid/带语言的代码围栏，或从博客工厂执行“增强美化”导出。

### Root Cause

手写 Markdown 解析器只把围栏语言写为 `language-*` CSS class，并未调用图表渲染器或语法高亮器；独立 HTML 不加载应用的 JavaScript bundle。

### Safe Pattern

`markdownToHtml()` 必须将 `mermaid` 围栏输出为带 `data-mermaid-render` 和可展开 `data-mermaid-source` 的独立块，源码始终经过 HTML 转义。`MarkdownPreview` 仅在实际存在 Mermaid 块时动态加载 Mermaid，并以 `securityLevel: "strict"`、`htmlLabels: false` 渲染；任何错误或超过 20,000 字符都回退显示源码。普通代码仅依据显式语言标识调用已注册的 Highlight.js 语言，不自动猜测。富文本复制必须使用未插入 Highlight.js span 的代码 HTML，并将 Mermaid 块异步渲染为内嵌 3 倍密度 PNG、移除复制按钮和源码折叠；PNG 必须默认按比例尽量填充 960×720 的逻辑显示区域、保留该显示宽高，并按比例应用 4,096 像素的最大边长，浏览器生成的增强 HTML 使用同一 PNG。命令行 `scripts/export-enhanced-html.mjs` 仍仅在含 Mermaid 时内嵌 runtime。

### Guardrail

运行 `node --check scripts/export-enhanced-html.mjs` 和 `cd frontend && npm run build`。手工确认深浅主题与手机宽度下：有效 Mermaid 显示 SVG、无效 Mermaid 显示错误和“查看 Mermaid 源码”、复制源码正确；Bash/Python/SQL 关键字可见高亮。将高亮代码粘贴至第三方编辑器，空格和缩进必须与源码一致。复制含 Mermaid 的富文本、或打开浏览器生成的增强 HTML 后，第三方编辑器应得到 PNG 图，而不包含复制按钮、折叠源码或 Mermaid runtime。

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

### Trusted Knowledge Long-Answer Save and Concurrent Edit

#### Symptom

Editing a long trusted-knowledge answer could remain in the saving state for an extended period and eventually show the browser-only `Failed to fetch` error.

#### Trigger

Save a long `AI_QA_LIB.ANSWER` value, or attempt to save a record while another transaction holds a row lock on it.

#### Root Cause

`knowledge.py` left the CLOB bind type to driver inference and issued `UPDATE AI_QA_LIB` without a bounded row-lock wait. The latter permits an unbounded wait and can outlive the browser/proxy connection.

#### Safe Pattern

Call `_set_knowledge_lob_input_sizes()` immediately before each insert/update SQL that includes `:answer`. For updates, execute `SELECT ... FOR UPDATE WAIT 5` first with only the lock query binds, then bind the CLOB and issue the update. Convert `ORA-30006` to a 409 conflict. Do not automatically retry a timed-out browser write because its commit result is unknown.

#### Guardrail

Run `PYTHONPATH=backend conda run -n alfred python -m unittest backend.tests.test_knowledge`. The tests prove that CLOB input sizing appears only on an SQL statement with `:answer`, and that a visible knowledge row is locked with `WAIT 5` before its update.

### Todo CLOB Bind Isolation

#### Symptom

Todo edits failed with:

```text
Oracle rejected the todo update: DPY-4008: no bind placeholder named ":title" was found in the SQL text
```

#### Trigger

Saving an existing Todo through `PATCH /todos/{todo_id}` after the backend introduced explicit Oracle CLOB binding for Todo `title` and `content`.

This could happen even when the final `update ai_todo_items` statement was valid, because the repository first executed a row-lock query:

```sql
select id
from ai_todo_items
where id = :todo_id ...
for update wait 5
```

That lock SQL does not contain `:title` or `:content`.

#### Root Cause

`backend/app/repositories/todos.py:update_todo()` called `cursor.setinputsizes(title=..., content=...)` before executing the lock query.

With python-oracledb, input sizes configured on the cursor apply to the next execute call. If a configured bind name is absent from that SQL text, the driver rejects the statement with `DPY-4008`.

A partial earlier fix only reduced the declared fields to the payload fields. That still failed whenever the next SQL statement was the lock query and the payload included `title` or `content`.

#### Safe Pattern

For dynamic SQL, call `setinputsizes()` only immediately before the SQL statement that contains those placeholders.

For Todo updates, preserve this order:

1. Execute the lock query with only lock parameters.
2. Confirm the row exists.
3. Call `_set_todo_lob_input_sizes(cursor, values.keys())`.
4. Execute the generated `update ai_todo_items` SQL.

Do not move `_set_todo_lob_input_sizes()` above the lock query.

#### Guardrail

`backend/tests/test_todos.py` uses `FakeCursor.execute()` to raise an Oracle-like error when declared input sizes do not match the next SQL statement's placeholders.

Relevant test:

```text
PYTHONPATH=backend conda run -n alfred python -m unittest backend.tests.test_todos
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

为每个模块验证仅显示当前 Agent 已关联的 Skill、默认 Skill 自动选中；以普通用户登录时，已分享且由管理员关联的其他用户 Skill 必须可见并可选，未分享的其他用户 Skill 必须不可见。再以 API 提交越权 Skill ID，确认它不会进入提示词或执行结果。

# Agent 选择器必须加载可调用而非仅自有的 Skill

## 症状

管理员已经为 Agent 关联并设置默认的已分享 Skill，但普通用户在业务模块看到“当前 Agent 暂无可调用 Skill”，或只能看到自己创建的 Skill。

## 触发条件

Skill 由 Alfred、管理员或另一位用户创建并开启分享；超级管理员将其关联到某个 Agent，普通用户随后打开该 Agent 对应的 Skill 选择器。

## 根因

`frontend/src/App.tsx:SkillSelector` 虽然传递了 `agentCode`，却以 `scope=owned` 请求列表。后端会先正确按 Agent 关联范围过滤，但 `owned` 会再次排除非当前用户所有的已分享 Skill。

## 安全模式

业务 Agent 的 `SkillSelector` 必须以 `enabled=true`、`scope=callable` 和 `agentCode` 请求列表。后端仍必须保留 `allowed_skill_ids()` 与 `get_prompt_skills(..., agent_code=...)` 的关联白名单校验；不得通过前端范围扩大可调用集合。

## 守护测试

配置一个已分享的外部 Skill 为 Agent 默认项后，以普通用户打开对应业务模块，确认该 Skill 显示、自动选中且可正常调用；确认同一用户不会看到未关联的已分享 Skill 或未分享的外部 Skill。再确认管理员撤销关联后，已选项会被清除。检查桌面/移动端和深浅主题，并运行 `cd frontend && npm run build`。

# Skill 连续键盘切换必须以最后一次选择为准

## 症状

在 Skill 管理左栏连续按上下方向键时，左侧高亮已移动，但右侧详情有时停留在先前的 Skill。

## 触发条件

选择一个 Skill 后，在详情请求尚未返回时连续按 `↑` 或 `↓` 切换到其它 Skill。

## 根因

`handleSelectSkill()` 曾在 `isSkillDetailLoading` 为真时直接跳过后续选择请求，造成左栏本地选中态与右侧详情状态不同步。

## 安全模式

Skill 详情加载不得因已有请求而丢弃新的用户选择。使用递增请求编号；只有编号仍等于最新请求的响应、错误和 loading 收尾操作可以写入状态，旧请求返回必须被忽略。

## 守护测试

在“我的 Skill”及“共享与系统 Skill”分别连续按 3 次 `↓`、再按 2 次 `↑`，确认每次最终高亮项与右侧元信息、文件列表一致；在网络节流下重复验证，旧响应不能覆盖最后选择。鼠标点击、输入控件内方向键、桌面/移动端与深浅主题均保持原有行为，并运行 `cd frontend && npm run build`。
