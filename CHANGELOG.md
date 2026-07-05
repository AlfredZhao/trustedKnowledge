# Changelog / 变更日志

All notable changes to this project will be documented in this file.
本文件记录项目中的所有重要变更。

The format follows the common GitHub changelog convention inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
格式遵循 GitHub 常见变更日志规范，并参考 Keep a Changelog。

## 本次版本更新

### [0.3.2]

#### Added / 新增

- Added `/health/db` for a focused Oracle connectivity check, plus unit tests around visibility clauses, admin module access, conversion workflows, current-record appends, and Blog Factory publish status synchronization.
- 新增 `/health/db` 用于单独检查 Oracle 连通性，并补充权限可见性条件、管理员模块权限、知识/Todo 转换、Todo 追加当前记录和博客工厂发布状态同步的单元测试。

#### Changed / 变更

- Split frontend display constants into `frontend/src/uiConfig.ts`, added a shared API client/cache invalidation layer, and reused a debounced-value hook across search inputs to reduce `App.tsx` maintenance cost without changing UI behavior.
- 将前端展示常量拆到 `frontend/src/uiConfig.ts`，新增统一 API client 与缓存前缀失效层，并复用搜索输入防抖 hook，在不改变界面行为的前提下降低 `App.tsx` 维护成本。

- Tightened backend field validation for knowledge/Todo tags and sources, Blog Factory article paths, and MetaWeblog URLs, while centralizing Oracle error conversion and adding runtime DDL logs.
- 收紧后端对知识/Todo 标签与来源、博客工厂文章路径、MetaWeblog URL 的字段校验，同时统一 Oracle 错误转换并为运行时 DDL 增加日志。

#### Fixed / 修复

- Fixed the Knowledge Processing to Blog Factory handoff so copying a processed result into Blog Factory now immediately marks the source knowledge record as `已发布`, removing it from the unpublished queue and leaving Blog Factory users to manage only the factory workflow state.
- 修复知识加工到博客工厂的状态衔接：将加工结果复制保存到博客工厂后，会立即把源知识记录标记为 `已发布`，从知识加工的未发布队列中移出；博客工厂侧只需继续维护工厂流程状态。

## 历史版本更新

### [0.3.1] - 2026-07-03

#### Added / 新增

- Added a user-controlled mobile navigation toggle in the top bar so the PWA grid menu can be collapsed or expanded on demand instead of always occupying vertical space.
- 为 PWA 顶部栏新增移动端导航显隐开关，功能网格菜单可由用户按需折叠或展开，不再始终占用首屏高度。

- Added a light theme option alongside the existing dark workspace theme, with a top-bar sun/moon toggle that persists the user's choice.
- 在现有深色工作台主题之外新增浅色主题，并提供顶部栏太阳/月亮一键切换，用户选择会持久化保存。

- Added task-content masking rules to Blog Factory, including a pop-up rule editor, per-browser local rule persistence, multi-keyword replacements, and built-in masking for phone numbers, emails, ID cards, bank cards, URLs, and IP addresses.
- 为博客工厂新增任务内容脱敏规则能力：支持弹出式规则配置、本地持久化保存多套规则、多关键词替换，以及手机号、邮箱、身份证、银行卡、URL、IP 等常见信息的内置脱敏。

#### Changed / 变更

- Changed the Overview trusted-knowledge panel to display only `未发布` knowledge items, and aligned the summary count with the same unpublished dataset.
- 调整总览中的可信知识面板为仅显示 `未发布` 状态记录，并让顶部摘要计数与该未发布数据集保持一致。

#### Fixed / 修复

- Fixed Codex per-user scheduling so AI Coding and Knowledge Processing no longer share a hard single-task lock; web Codex concurrency is now configurable per user, and AI Coding restores only the latest `full` mode job to avoid cross-restoring Knowledge Processing runs.
- 修复 Codex 的按用户调度限制：AI 编程与知识加工不再共享硬编码的单任务锁；网页 Codex 现支持按用户配置并发上限，且 AI 编程只会恢复最近一次 `full` 模式任务，避免把知识加工任务误恢复到编程工作台。

- Fixed Blog Factory CNBlogs publishing so the publish dialog now exposes a `投稿选项` selector that defaults to `投稿至博客园首页`, and CNBlogs publish requests pass that choice through instead of silently omitting homepage submission.
- 修复博客工厂发布到博客园时缺少 `投稿选项` 的问题：发布弹窗现在提供 `投稿选项` 选择，并默认设为 `投稿至博客园首页`；博客园发布请求也会把该选择一并提交，不再静默遗漏首页投稿设置。

- Fixed Blog Factory CNBlogs category selection so the publish dialog now loads the current blog's个人分类列表 for selection, replacing the previous free-form tag entry behavior during发布.
- 修复博客工厂发布到博客园时的分类选择方式：发布弹窗现在会读取当前博客的个人分类列表供用户勾选，替代之前依赖自由标签文本的发布行为。

- Fixed Blog Factory CNBlogs category filtering so the publish dialog now treats `投稿选项` as the sole homepage-submission control and only keeps `随笔分类` entries in the category checklist, removing the confusing duplicate `发布至博客园首页` pseudo-category.
- 修复博客工厂发布到博客园时的个人分类筛选：发布弹窗现在以 `投稿选项` 作为唯一的首页投稿开关，分类勾选区只保留 `随笔分类` 条目，移除容易引起误解的 `发布至博客园首页` 伪分类。

- Fixed Blog Factory CNBlogs homepage submission so `投稿选项` now also auto-syncs the special `发布至博客园首页` category during Metaweblog publish requests, matching CNBlogs'实际投稿行为 instead of relying on `inSiteHome` alone.
- 修复博客工厂发布到博客园首页投稿的实际生效问题：`投稿选项` 现在会在 Metaweblog 发布时自动同步特殊的 `发布至博客园首页` 分类，不再只依赖 `inSiteHome` 字段，从而更贴近博客园真实投稿行为。

- Fixed Blog Factory Metaweblog publishing so CNBlogs personal categories no longer leak into `Tag` labels; the publish dialog now submits `随笔分类` as categories and keeps `Tag 标签` as a separate editable field sourced from the task's主题标签, while caching CNBlogs category lists to reduce repeat wait time.
- 修复博客工厂 Metaweblog 发布时的分类/标签串线问题：博客园个人分类不再写入 `Tag` 标签；发布弹窗现在将 `随笔分类` 单独作为分类提交，并把 `Tag 标签` 独立为可编辑字段，默认取任务记录中的主题标签；同时为博客园分类列表增加缓存，减少重复打开时的等待时间。

- Fixed Blog Factory Metaweblog draft/update behavior so saved drafts now persist the remote `post_id` and publish settings, letting later `保存草稿` update the same post, `确认发布` upgrade the draft in place, and the dialog reopen with the last-used config, categories, tags, and submission option restored.
- 修复博客工厂 Metaweblog 的草稿/更新链路：已保存的草稿现在会持久化远端 `post_id` 和发布参数，后续再次 `保存草稿` 会更新同一篇文章，`确认发布` 会在原草稿上原地转为正式发布；重新打开弹窗时也会自动回填上次使用的配置、分类、标签和投稿选项。

- Fixed Blog Factory enhanced-HTML export code blocks so downloaded standalone HTML now preserves source line breaks, disables forced wrapping, and allows horizontal scrolling for long code lines; the same behavior is mirrored in the offline `scripts/export-enhanced-html.mjs` exporter.
- 修复博客工厂增强美化导出 HTML 的代码块展示：下载的独立 HTML 现在会保留源代码换行、不再强制自动折行，并支持长代码横向滚动；同样的行为也同步到了离线导出脚本 `scripts/export-enhanced-html.mjs`。

- Fixed Todo editor switching so unsaved changes are now preserved per item while navigating the Todo list; users can switch away and return without losing local edits, and the editor shows an explicit unsaved-change reminder until saved.
- 修复待办事项编辑区的切换丢稿问题：现在每条 Todo 都会单独保留本地未保存草稿，用户切换到别的事项后再返回也不会丢失输入；编辑区同时增加未保存提示，避免误以为已落库。

- Fixed low-contrast light-theme action buttons by strengthening the light-only secondary and amber action styles, so controls such as Todo `转为知识` remain legible without changing dark-theme visuals.
- 修复浅色主题下部分操作按钮对比度过低的问题：增强仅作用于浅色主题的次级按钮与琥珀色操作按钮样式，使待办事项中的 `转为知识` 一类控件更清晰，同时不改动深色主题视觉。

- Further refined light-theme contrast for utility chips, empty-state cards, dashed hint panels, and Markdown preview surfaces so non-button UI elements stay readable under the new light palette.
- 继续优化浅色主题下的可读性：提高工具标签、空状态卡片、虚线提示框和 Markdown 预览面板的对比度，避免非按钮控件在浅色配色中继续显得发灰发淡。

- Fixed light-theme Todo `处理中` status chips and confirmation dialogs so the processing badge uses darker sky tones and the `转为知识` confirmation popup no longer keeps a dim dark panel.
- 修复浅色主题下 Todo `处理中` 状态标签和确认弹窗的可读性：处理中徽标改用更深的 sky 色阶，`转为知识` 确认弹窗不再沿用偏暗且不清晰的深色面板。

- Fixed the light-theme refresh loading state so the skeleton cards and scan shimmer use light-mode colors immediately on reload instead of flashing the old dark loading surface first.
- 修复浅色主题下页面刷新时的加载态：骨架卡片与扫光效果会在重载瞬间直接使用浅色模式配色，不再先闪回旧的深色加载界面。

- Fixed the static `Trusted Knowledge / 加载中...` boot screen in `index.html` so manual page refreshes now honor the saved light theme before React mounts, instead of always showing the dark startup background first.
- 修复 `index.html` 中静态 `Trusted Knowledge / 加载中...` 启动页的主题同步：手工刷新页面时会在 React 挂载前先读取并应用已保存的浅色主题，不再固定先显示深色启动背景。

- Fixed the AI Coding `服务重启` warning copy in light theme by using the already-supported amber text contrast, so the `scripts/restart-all.sh` downtime notice no longer appears washed out.
- 修复 AI 编程页 `服务重启` 提示文案在浅色主题下的对比度：改用项目已适配的 amber 警示文字色阶，`scripts/restart-all.sh` 的停机说明不再发灰难辨。

- Fixed the Blog Factory `博客发布` helper copy in light theme by using the light-theme-supported slate text tone, so the line under the publish button remains readable.
- 修复博客工厂 `博客发布` 按钮下方说明文案在浅色主题下的对比度：改用浅色主题已适配的 slate 文字色阶，按钮下的提示信息不再发灰难读。

- Fixed light-theme modal surfaces so Blog Factory `博客工厂记录` actions like `配置API` and `发布到博客`, along with other button-triggered dialogs, no longer keep dark `ink` panels or overly dim overlays.
- 修复浅色主题下的弹窗表面配色：博客工厂 `博客工厂记录` 中的 `配置API`、`发布到博客` 以及其它按钮触发的对话框不再保留深色 `ink` 面板和过暗遮罩。

- Fixed the AI Ask result skill chips in light theme so selected skill names such as `自动化原始周报清洗规整` remain readable above the answer card.
- 修复 AI 问数结果区的已选 Skill 标签在浅色主题下的可见性：像 `自动化原始周报清洗规整` 这类名称现在会在答案卡片上方保持清晰可读。

### [0.3.0] - 2026-07-01

#### Added / 新增

#### Changed / 变更

- Changed the Overview dashboard metric tiles so the four key-status cards now render in a two-column grid on mobile PWA screens instead of stacking one per row.
- 调整总览 Dashboard 的顶部指标卡片布局：手机端 PWA 中“关键状态”下的 4 张卡片改为每行 2 张显示，不再单列纵向堆叠。

- Changed the Blog Factory publish controls to keep a single `发布到博客` entry that opens the existing publish dialog, removing the redundant direct-publish and draft shortcut buttons.
- 调整博客工厂发布操作区：保留单一 `发布到博客` 入口并沿用现有发布弹窗，移除重复的直接发布和草稿快捷按钮。

#### Fixed / 修复

- Fixed Blog Factory Metaweblog publishing for CNBlogs-oriented setups so posts default to Markdown delivery, and the published body now strips the leading H1 that is already used as the article title.
- 修复博客工厂 Metaweblog 发布到博客园一类目标时的正文格式：默认按 Markdown 方式发送内容，并在发布正文中去掉已作为文章标题使用的首个一级标题，避免页面重复显示主标题。

- Fixed AI Coding task recovery after Codex failures so stale in-memory running jobs are reconciled before new submissions, timed-out orphan jobs are marked failed instead of blocking later runs, and refreshes now keep the failed-task snapshot visible.
- 修复 AI 编程在 Codex 失败后的恢复链路：新任务提交前会先对账并清理残留的运行中任务，超时失联的孤儿任务会改记为失败而不是持续阻塞，页面刷新后也会继续显示最近一次失败任务快照。

- Fixed Blog Factory task-content Markdown rendering and rich-copy output so `$$...$$` LaTeX formula blocks now render as styled formula cards instead of leaking raw delimiter text in preview, standard beautified copy, and enhanced beautified copy.
- 修复博客工厂任务内容的 Markdown 渲染与富文本复制链路：`$$...$$` LaTeX 公式块现在会以公式卡片样式展示，不再在详情预览、普通美化复制和增强美化复制中直接泄漏原始定界符文本。

- Fixed AI Coding Codex job ownership and recovery so running-task locks now apply per signed-in user instead of globally, and the frontend auto-restores the current user's latest task when a stale `already running` conflict is encountered.
- 修复 AI 编程 Codex 任务归属与恢复链路：运行中任务锁现在按当前登录用户隔离，不再全局互相阻塞；当前端遇到残留的 `already running` 冲突时，也会自动恢复当前用户最近一次任务状态。

### [0.2.9] - 2026-06-30

#### Added / 新增

- Added a user-relation graph preview to User Management, including focus-user selection, relation-status filtering, full-graph or related-only scope, and an Oracle Property Graph rollout panel mapped from `TK_USERS` and `TK_RELATIONS`.
- 新增用户管理中的用户关系图预览：支持焦点用户选择、关系状态筛选、完整图谱/仅相关节点范围切换，并附带基于 `TK_USERS` 与 `TK_RELATIONS` 的 Oracle Property Graph 落地建议面板。

- Added Metaweblog API blog publishing to Blog Factory, including per-user multi-config persistence, credential validation, default-config direct publish, and a publish dialog that can send the current Markdown article as either a draft or a published post.
- 为博客工厂新增 Metaweblog API 博客发布能力：支持按用户持久化多套发布配置、账号校验、默认配置直接发布，以及可将当前 Markdown 文章按“草稿 / 正式发布”模式推送到博客的发布弹窗。

#### Changed / 变更

- Changed the user-management frontend overview documentation to include the new graph panel placement, controls, and mobile stacking behavior.
- 更新用户管理前端概览文档，补充新的关系图卡片位置、交互控件，以及移动端纵向堆叠行为说明。

- Changed the Blog Factory article panel to expose `配置API`, `发布博客`, and bottom `发布到博客` actions while keeping the existing Markdown editing flow intact; successful Metaweblog publishes now also sync the related knowledge and factory statuses to `已发布`.
- 调整博客工厂文章面板：在保留现有 Markdown 编辑流程的前提下，新增 `配置API`、`发布博客` 以及底部 `发布到博客` 操作；Metaweblog 发布成功后会同步把关联知识和工厂状态更新为 `已发布`。

- Refined the Blog Factory publish layout by moving Metaweblog configuration and publish actions out of the Markdown article editor into the task-content area, with cleaner desktop grouping and mobile-friendly stacked controls.
- 优化博客工厂发布区布局：将 Metaweblog 配置与发布入口从 Markdown 文章编辑区迁移到任务内容区域，并针对桌面端分组与移动端纵向堆叠做了界面整理。

- Simplified the Blog Factory detail layout further by removing the standalone `Markdown 文章` panel; blog publishing now publishes the saved article when present, otherwise falls back to task content.
- 进一步精简博客工厂详情布局：移除了独立的 `Markdown 文章` 面板；博客发布时会优先使用已保存文章，如不存在则自动回退到任务内容。

- Refined the User Management graph preview styling to match the existing glassmorphism UI more closely, with softer edge layering, external node labels, clearer status colors, and better graph-text contrast.
- 优化用户管理关系图预览的视觉样式，使其更贴近现有玻璃态 UI：关系线分层更柔和，节点改为外置标签卡片，状态色更清晰，图中文字与背景对比也更稳定。

- Changed Current Records so `新增当前分类` is no longer a permanently visible side panel; the action now lives as an `新增分类` button in the list area and opens a modal only when needed.
- 调整“当前记录”模块：`新增当前分类` 不再常驻占用独立区域，改为放在列表区内的 `新增分类` 按钮，点击后按需弹窗录入。

#### Fixed / 修复

- Fixed Blog Factory publish-config routing so `/api/blog-factory/publish-configs` is matched before the `/{item_id}` detail route; saved Metaweblog configs now load again instead of failing with HTTP 422 on refresh.
- 修复博客工厂发布配置路由顺序：`/api/blog-factory/publish-configs` 现在会优先于 `/{item_id}` 详情路由匹配；刷新界面时已保存的 Metaweblog 配置不再因 HTTP 422 而加载失败。

- Fixed the Blog Factory `配置API` data refresh path so reopening the config or publish dialogs after a service restart now re-requests saved Metaweblog configs instead of leaving the desktop list stuck empty after an earlier failed load.
- 修复博客工厂 `配置API` 的数据刷新链路：服务重启后重新打开配置弹窗或发布弹窗时，会重新请求已保存的 Metaweblog 配置，不再因为之前一次加载失败而让桌面端列表一直显示为空。

- Fixed Blog Factory Metaweblog config ownership so the same login username now reads the same `配置API` data across devices; existing rows are backfilled to an explicit `owner_username` key instead of relying only on nullable `user_id`.
- 修复博客工厂 Metaweblog 配置归属逻辑：同一登录用户名现在会在不同设备上读取同一套 `配置API` 数据；已有配置也会补回到显式的 `owner_username` 归属键，不再只依赖可为空的 `user_id`。

- Fixed the Blog Factory publish feedback layout so draft/publish success messages now render below the action buttons instead of squeezing the four-button row on desktop.
- 修复博客工厂发布反馈布局：草稿/正式发布成功提示现在会显示在操作按钮下方，不再挤压桌面端四个发布按钮的文字。

- Fixed the mobile `配置API` dialog so the modal itself becomes scrollable on small screens and the saved config list keeps the form footer reachable.
- 修复移动端 `配置API` 弹窗滚动：小屏设备上弹窗整体可滚动，已保存配置列表不会再把表单底部操作区卡出可视范围。

### [0.2.8] - 2026-06-26

#### Added / 新增

- Added an Alfred-only Oracle dry-run SQL helper for `T_CURRENT` type consolidation planning, so the current-record merge into `Work / Study / Life / Info` can be previewed safely before any data update.
- 新增仅针对 Alfred 的 Oracle dry-run SQL 辅助脚本，用于预演 `T_CURRENT` 向 `Work / Study / Life / Info` 的类型收敛，先安全核对合并结果，再决定是否执行正式数据更新。

- Added an Alfred-only formal Oracle migration SQL helper for `T_CURRENT` type consolidation, covering backup creation, keeper-row consolidation, contributor-row deletion, and post-run verification before manual commit.
- 新增仅针对 Alfred 的正式 Oracle 迁移 SQL 辅助脚本，覆盖 `T_CURRENT` 收敛前备份、keeper 行合并、贡献行删除，以及手动提交前的结果校验。

- Added a local Markdown-to-HTML export script under `scripts/export-enhanced-html.mjs` that resolves image paths relative to the source Markdown file and inlines local images as base64, so MWeb-style articles with `media/...` assets can be exported as self-contained HTML outside the web UI.
- 新增本地导出脚本 `scripts/export-enhanced-html.mjs`：会按源 Markdown 文件所在目录解析图片路径，并将本地图片内联为 base64，适合把 MWeb 风格 `media/...` 资源的文章导出为独立 HTML，而不依赖 Web 界面当前访问路径。

#### Changed / 变更

- Changed current-record frontend defaults to prefer `Work / Study / Life / Info` in order when choosing append targets, and auto-clear stale cached type filters that no longer exist after Alfred's type consolidation.
- 调整当前记录前端默认行为：追加目标会按 `Work / Study / Life / Info` 顺序优先选择；同时在 Alfred 分类收敛后，会自动清理本地缓存里已失效的旧类型筛选值。

- Changed the Information Entry todo creation flow so checking `这是待办事项` now shows a todo status selector, defaulting new todo entries to `处理中` while still allowing users to switch to other statuses before submit.
- 调整信息录入中的待办创建流程：勾选 `这是待办事项` 后会显示待办状态选择器，新建待办默认落在 `处理中`，同时仍支持提交前切换为其他状态。

- Changed Knowledge Processing to request Codex final-only output for skill runs, so the result pane no longer shows leaked “read selected skill / analyze task” intermediary planning text.
- 调整知识加工的 Codex 调用方式为读取最终消息输出，避免加工结果区域继续混入“读取所选 skill / 分析任务”等中间规划文本。

- Changed Knowledge Processing prompts to elevate Markdown image preservation into a call-level hard rule, and updated Markdown preview rendering so relative image paths such as `media/...` can be preserved in rendered mode instead of being dropped from display parsing.
- 调整知识加工提示词，将 Markdown 图片逐字保留提升为调用级硬约束；同时补齐 Markdown 预览对 `media/...` 等相对图片路径的渲染支持，避免展示链路把图片地址当作无效内容丢掉。

- Changed Knowledge Processing final-mode prompting to inline selected skill content instead of asking Codex to first read `SKILL.md`, and added a deterministic cleanup step for leaked process-preface wording and banned “素材…” summary phrases before showing the result.
- 调整知识加工 final 模式的提示构造：直接内联所选 Skill 内容，不再要求 Codex 先读取 `SKILL.md`；同时在结果展示前新增确定性清洗，去掉泄漏的过程前置说明以及被 Skill 禁止的“素材……”类总结话术。

- Changed Blog Factory enhanced Markdown copy to try embedding accessible image references as base64 data URLs before writing HTML to the clipboard, so pasted content is less dependent on local relative image paths.
- 调整博客工厂增强美化复制：写入剪贴板前会尝试把可访问的图片引用内联为 base64 data URL，降低外部编辑器粘贴时对本地相对图片路径的依赖。

- Changed Blog Factory enhanced copy to also download a standalone `.html` file locally, so the exported article/task content can be opened directly in a browser on the same machine after copying.
- 调整博客工厂增强美化复制：复制的同时会额外下载一个可独立打开的 `.html` 文件，便于在本机浏览器直接查看导出的文章或任务内容。

- Changed Todo-to-current append requests to send an explicit “replace existing content” flag whenever the dialog selection advances to a new `week/day`, so backend writes can deterministically distinguish true progression from same-slot prepend behavior.
- 调整待办事项追加到当前记录的请求协议：当弹窗选择推进到新的 `week/day` 时，会显式传递“覆盖旧内容”标记，让后端稳定区分“推进新记录点”和“同记录点前置追加”两种写入行为。

#### Fixed / 修复

- Fixed Todo completion append behavior so choosing a new `week/day` now follows Current Record progression semantics: advancing to a new record point clears prior content instead of prepending the old history into the new slot.
- 修复待办事项完成后追加到当前记录的推进语义：当用户选择新的 `week/day` 时，现在会按“推进到新记录点”处理，清空旧内容后只写入新内容，不再把历史内容一并拼进新的记录点。

- Fixed Todo completion confirmation flow so newly created or just-converted Todo items correctly detect the first transition into `已完成`, and the append dialog no longer overwrites a manually chosen `week/day` with late-loaded defaults.
- 修复待办事项完成确认弹窗的触发与默认值回填：新建或刚转换出的 Todo 现在能正确识别第一次切到 `已完成` 的状态变化；同时追加弹窗不会再被异步加载的默认值覆盖掉用户手动选择的 `week/day`。

### [0.2.7] - 2026-06-24

#### Added / 新增

- Added an independent `admin_enabled` flag in `TK_USERS` plus frontend controls for granting existing users an admin role without changing their `USER` / `PARENT` identity.
- 新增 `TK_USERS.admin_enabled` 独立管理员标记，并在前台用户管理中支持为现有用户授予 admin 角色，且不改变其 `USER` / `PARENT` 身份。

#### Changed / 变更

- Changed AI Coding and AI Usage to follow the same admin-only navigation rule as User Management by default, with super admin configurable access for admin-role users.
- 调整 AI 编程与 AI 用量模块，默认与用户管理一样仅 admin 用户可见；超级管理员可在前台把它们授权给 admin 角色用户访问。

- Changed Blog Factory article copy behavior to add an enhanced rich-copy button for WeChat-style publishing, while keeping the original Markdown copy path unchanged.
- 调整博客工厂文章复制行为：新增适合公众号粘贴的增强美化复制按钮，并保留原有 Markdown 复制逻辑不变。

- Changed Blog Factory task/article editing flow so task content can be copied with enhanced styling directly and loaded into the Markdown article editor without manual paste; Markdown table rendering is now recognized in previews and rich-copy output.
- 调整博客工厂任务/文章编辑流程：任务内容现在可直接增强美化复制，也可一键载入 Markdown 正文编辑区，无需手工粘贴中转；同时补齐 Markdown 表格的预览与富文本复制识别。

- Changed Skill management and invocation to be user-aware: custom skills now track owner, publish state, and system/user type; the Skill page defaults to showing only editable self-owned skills, while published skills remain callable by other users in AI Ask, Knowledge Processing, and AI Coding.
- 调整 Skill 管理与调用范围为按用户隔离：自建 Skill 新增所有者、发布状态和系统/用户类型；Skill 页面默认只显示当前用户可编辑的自有 Skill，而已发布 Skill 仍可在 AI 问数、知识加工和 AI 编程中被其他用户调用。

- Added a subtle top-right signed-in user indicator so the current login username stays visible without competing with primary actions.
- 在顶部栏右上角新增低干扰的当前登录用户名提示，持续显示“当前是谁登录”，但不抢占主要操作视觉。

- Added per-user filters to Information Entry, Knowledge Processing, Blog Factory, Todo, and English Materials, with ordinary users defaulting to their own records instead of the combined visible-user scope.
- 为信息录入、知识加工、博客工厂、待办事项和英语素材补充按用户筛选；普通用户默认先查看自己的数据，而不是直接落在“自己 + 可见孩子”的合并范围。

#### Fixed / 修复

- Fixed the Todo completion append dialog so it also lets users adjust `Week` and `Day` while prepending a finished task into the selected Current Record, instead of limiting the action to only user and type.
- 修复待办事项完成后的追加弹窗只能选择用户和类型的问题；现在追加到当前记录时也可同步选择并推进 `Week` 与 `Day`。

- Changed the Overview dashboard to always query the signed-in username for Todo, trusted knowledge, and English material cards, so it no longer mixes in other visible users' records.
- 调整总览 Dashboard 的 Todo、可信知识和 English 素材查询，固定按当前登录用户名读取，不再混入其他可见用户的数据。

- Allowed nullable `NEXT_RESET_AT` values in the LLM usage API so the AI Usage view no longer fails with HTTP 500 when `V_LLM_USAGE` contains samples without a reset timestamp.
- 修复 `V_LLM_USAGE` 中 `NEXT_RESET_AT` 为空时 AI 用量接口响应模型校验失败的问题；用量视图不再因此报 HTTP 500。

- Made backend startup tolerate a missing legacy `T_RELATIONS` table so service restarts no longer fail after that old migration source table is removed.
- 修复删除旧兼容迁移表 `T_RELATIONS` 后后端启动直接失败的问题；启动阶段现在会在该表不存在时自动跳过旧关系迁移。

### [0.2.6] - 2026-06-22

#### Added / 新增

- Added the independent `TK_` user management schema with `TK_USERS`, `TK_USER_SESSIONS`, and `TK_RELATIONS`, including compatible `USER_ID` backfill for current/history records.
- 新增独立 `TK_` 用户管理体系，包含 `TK_USERS`、`TK_USER_SESSIONS` 和 `TK_RELATIONS`，并为当前记录/历史记录兼容回填 `USER_ID`。

- Added compatible `USER_ID` ownership columns for `AI_BLOG_FACTORY`, `AI_QA_LIB`, `AI_TODO_ITEMS`, and `T_DOUYIN_DETAILS`.
- 为 `AI_BLOG_FACTORY`、`AI_QA_LIB`、`AI_TODO_ITEMS` 和 `T_DOUYIN_DETAILS` 新增兼容 `USER_ID` 归属列。

- Added ordinary-user session login alongside the existing environment-based `admin` super administrator.
- 新增普通用户 session 登录，同时保留现有环境变量 `admin` 超级管理员登录方式。

- Added an admin-only User Management workspace for creating users, changing roles/status, resetting passwords, and maintaining parent-child visibility relations.
- 新增仅 admin 可见的用户管理界面，支持创建用户、调整角色/状态、重置密码，以及维护家长-孩子可见关系。

- Added selected Blog Factory task editing, content status updates, deletion, and a mobile PWA detail sheet.
- 为博客工厂选中任务新增编辑、内容状态更新、删除能力，并在手机端 PWA 中改为弹窗操作。

- Added a Blog Factory task detail copy button for copying saved task content directly.
- 为博客工厂任务详情新增任务内容复制按钮，可直接复制已保存的任务内容。

- Added rendered Markdown and plain-text copy mode selection for Blog Factory task content.
- 为博客工厂任务内容复制新增 Markdown 美化富文本和裸文本两种模式。

#### Changed / 变更

- Scoped Current Records, History, and AI Ask history data by visible users for ordinary users, while `admin` keeps the existing all-user view.
- 当前记录、历史查询和 AI 问数会按普通用户的可见用户范围过滤数据，`admin` 保持现有全量视图。

- Scoped Knowledge, Todo, Blog Factory, and English Materials data by visible users, with conversions inheriting the source record `USER_ID`.
- 可信知识、待办事项、博客工厂和英语素材也会按可见用户范围过滤，模块转换会继承源记录的 `USER_ID`。

- Changed Current Records and History user filters so non-admin users are limited to visible users, with single-user scopes locked in the UI.
- 调整当前记录和历史查询的用户筛选：非 admin 用户只能在可见用户范围内筛选，单用户范围会在界面中锁定。

- Increased the Codex prompt limit from 12,000 to 50,000 characters so Knowledge Processing can handle longer source material.
- 将 Codex prompt 限制从 12,000 字提升到 50,000 字，知识加工可处理更长的原始素材。

#### Fixed / 修复

- Cleaned leaked Markdown code placeholders from Knowledge Processing Skill results and Markdown previews before display, copy, and save.
- 修复知识加工 Skill 结果和 Markdown 预览中偶发残留 `@@CODE0@@`、`@@CODE_0@@` 或私有 Unicode `CODE0` 占位符的问题，展示、复制和保存前会统一清理。

### [0.2.5] - 2026-06-18

#### Added / 新增

- Added a maintained frontend UI overview documenting current layouts, feature surfaces, and display-only tuning knobs such as dashboard limits and list page sizes.
- 新增前端界面概览维护文档，记录当前布局、功能界面，以及总览展示数量、列表分页条数等纯前端展示配置点。

- Added a frontend-selectable Chinese technical blog skill based on the Codex blog skill, adapted for read-only Knowledge Processing output.
- 新增前台可选择的中文技术博客 Skill，基于 Codex blog skill 改造，并适配知识加工只读输出场景。

- Added an Overview dashboard that brings together LLM usage, processing Todo items, recent English material, and trusted knowledge signals.
- 新增总览 Dashboard，集中展示 LLM 用量、处理中待办、最近 English 素材和可信知识状态。

- Added rendered Markdown viewing and mode-aware copying for AI Ask answers, with rich HTML clipboard output in rendered mode.
- 为 AI 问数回答新增 Markdown 美化展示和按模式复制，美化模式下复制富文本 HTML。

- Added shared Markdown preview and clipboard utilities so future Markdown surfaces can reuse the same rendered display and document-friendly rich-copy behavior.
- 新增通用 Markdown 预览组件与复制工具，后续 Markdown 界面可复用同一套美化展示和文档友好的富文本复制行为。

- Added a Todo completion prompt that can prepend completed task details to a selected Current Record by user and type.
- 为待办事项完成保存新增追加提示，可按用户和类型选择当前记录，并将任务详情前置追加到 CONTENT。

- Added a History query detail dialog so selecting a result opens the full record content and metadata.
- 为历史查询结果新增详情弹窗，点击记录可查看完整内容和元数据。

- Added a Skill management workspace for creating custom skills, uploading standard skill zip packages, editing skill files, and selecting enabled skills in AI Ask.
- 新增 Skill 管理界面，支持自定义 skill、上传标准 skill zip 包、编辑 skill 文件，并可在 AI 问数中选择启用的 skill 调用。

- Added skill selection and direct Codex result generation to Knowledge Processing, replacing the old copy-only skill task package flow.
- 为知识加工新增 Skill 选择和 Codex 直接生成结果能力，替代原先只生成并复制 skill 任务包的流程。

#### Changed / 变更

- Changed Skill zip upload size validation to use configurable `TRUSTED_KNOWLEDGE_SKILL_MAX_ZIP_MB`, defaulting to 20MB.
- 将 Skill zip 上传大小限制改为可配置的 `TRUSTED_KNOWLEDGE_SKILL_MAX_ZIP_MB`，默认 20MB。

- Standardized the existing weekly report cleaner skill with YAML frontmatter and clearer input/output boundaries.
- 将现有周报清洗 Skill 标准化为带 YAML frontmatter 的格式，并明确输入输出边界。

- Added rendered Markdown viewing and rich-copy/plain-copy mode selection to Knowledge Processing Skill results.
- 为知识加工 Skill 加工结果新增 Markdown 美化展示，并支持复制美化富文本或裸文本。

- Updated the navigation and related entry copy from `知识录入` to `信息录入`.
- 将导航及相关录入提示文案从 `知识录入` 调整为 `信息录入`。

- Refined History query mobile layouts so detail metadata and summary metrics use denser two-column rows.
- 优化历史查询模块手机端布局，详情元信息和汇总指标改为更紧凑的双列展示。

#### Fixed / 修复

- Changed Skill management file lists to collapse folders by default and expand their files on demand.
- 修复 Skill 管理文件列表默认展开所有目录内容的问题，文件夹现在默认折叠，点击后再显示目录内文件。

- Stopped injecting frontend Skill metadata into prompts and changed Codex skill use to load selected skill directories progressively.
- 调整 Skill 调用方式：前端 Skill 元信息不再注入 prompt，Codex 改为按所选 skill 目录渐进式读取指令和引用文件。

- Hardened Knowledge Processing skill generation so it requires an explicit skill selection and runs Codex in read-only mode.
- 加固知识加工 Skill 生成流程，要求显式选择 skill，并以只读模式运行 Codex。

- Fixed Overview refresh feedback and partial-load handling so the refresh action shows progress and one failed data source no longer blocks the whole dashboard.
- 修复总览刷新反馈与局部加载处理，点击刷新会显示进度，单个数据源失败不再阻断整个 Dashboard。

- Fixed AI Coding refresh recovery so the workspace reloads the latest Codex task when the page refreshes after completion.
- 修复 AI 编程完成后页面刷新时未恢复最后一次任务详情的问题，刷新后会回填最近一次 Codex 任务。

- Added mobile editor sheets for Information Entry and Todo items so tapping a list item in the PWA opens the edit view directly.
- 为信息录入和待办事项新增手机端编辑弹层，PWA 中点击列表条目会直接打开编辑界面。

### [0.2.4] - 2026-06-15

#### Added / 新增

- Added a copy button to the Todo edit panel for copying the current title and content with short success feedback.
- 为待办事项编辑面板新增复制按钮，可复制当前标题和内容，并在成功后短暂显示已复制状态。

- Added previous and next navigation controls to the Todo edit panel, including page-boundary switching within the current filters.
- 为待办事项编辑面板新增上一条和下一条切换按钮，并支持在当前筛选条件下跨分页切换。

- Added previous and next navigation controls to the Trusted Knowledge edit panel, including page-boundary switching within the current filters.
- 为可信知识编辑面板新增上一条和下一条切换按钮，并支持在当前筛选条件下跨分页切换。

- Added a global AI Coding task status indicator in the top bar so background Codex task progress and completion stay visible across workspaces.
- 为 AI 编程新增顶部公共任务状态提示，使后台 Codex 任务执行中与完成状态可在各功能界面持续可见。

- Added an AI Coding GitHub sync action that runs `scripts/commit-to-github.sh` and preserves the latest sync log tail until manually cleared.
- 为 AI 编程新增 GitHub 同步按钮，可调用 `scripts/commit-to-github.sh`，并保留最近一次同步日志尾部直到手动清理。

- Added automatic default sequence numbers for new English Materials entries using the current maximum sequence plus one.
- 为英语素材录入新增序号默认值，自动使用当前最大序号加一。

- Added database-backed OpenAI-compatible LLM configuration for AI Ask, including Base URL, model, API key, and enablement controls.
- 为 AI 问数新增数据库持久化的 OpenAI 兼容模型配置，支持 Base URL、模型、API Key 和启用开关。

#### Changed / 变更

- Updated the Todo edit panel field wording from title/content to task goal/task content.
- 将待办事项编辑面板字段文案从标题/内容调整为任务目标/任务内容。

- Updated navigation labels: `录入工作台` is now `知识录入`, and `知识加工厂` is now `知识加工`.
- 更新导航栏名称：`录入工作台` 改为 `知识录入`，`知识加工厂` 改为 `知识加工`。

- Updated the knowledge entry form copy so selecting `这是待办事项` switches the heading, title field, and content field to todo-specific wording.
- 更新知识录入表单文案，勾选 `这是待办事项` 后标题、标题字段和内容字段会切换为待办事项语境。

- Changed the AI Coding workspace to show only the latest task result, and hide it after that latest task is archived.
- 调整 AI 编程界面仅显示最近一次任务情况；最近一次任务归档后不再显示旧任务。

- Changed English Materials flag displays from stored numeric values to user-facing status labels.
- 将英语素材管理中的 flag 展示从表内数字值调整为用户可理解的发布状态文案。

- Changed AI Ask LLM summaries to call the configured OpenAI-compatible endpoint from the backend instead of the fixed database `chat_llm` function.
- 将 AI 问数的 LLM 总结改为后端读取配置后调用 OpenAI 兼容接口，不再固定依赖数据库 `chat_llm` 函数。

- Changed AI Ask LLM secrets so API keys are read from backend environment configuration and the old database key column is removed when LLM config is opened.
- 调整 AI 问数 LLM 密钥管理，API Key 改为读取后端环境变量，并在打开模型配置时移除数据库中遗留的密钥列。

#### Fixed / 修复

- Fixed AI Ask relative date recognition so phrases such as `最近一周` are converted into strict history date filters before statistics are generated.
- 修复 AI 问数相对日期识别，`最近一周` 等表达会在统计前转换为明确的历史日期筛选条件。

- Fixed the Knowledge Factory unpublished queue so stale cached empty results and out-of-range restored pages no longer hide existing unpublished knowledge.
- 修复知识加工厂未发布队列，避免旧的空结果缓存或恢复到越界页码时隐藏实际存在的未发布知识。

- Fixed Knowledge Factory search so saved search terms are visible in the empty state and knowledge search also matches source and topic tags.
- 修复知识加工厂搜索空态，明确显示当前搜索词，并让知识搜索同时匹配来源和标签。

- Fixed `backend/.env.example` so it matches the current backend environment structure while keeping sensitive values redacted.
- 修复 `backend/.env.example`，使其与当前后端环境变量结构对齐，并保留敏感信息脱敏占位。

- Fixed the History query date filters so start and end date fields stack cleanly on mobile and stay within the page bounds.
- 修复历史查询模块开始日期与结束日期筛选框在手机端重叠、越界的问题。

- Fixed desktop and mobile function navigation labels so they share one source and use the mobile names consistently.
- 修复电脑端与手机端功能导航名称不一致的问题，统一使用手机端当前名称并改为共享配置。

- Fixed the desktop function navigation expand/collapse interaction so labels and button widths animate more smoothly.
- 优化电脑端功能导航展开与收起交互，使功能名称和按钮宽度过渡更丝滑。

- Fixed the AI Coding workspace so Codex task results can be restored after navigating away or refreshing the page.
- 修复 AI 编程任务完成结果在切换页面或刷新后丢失的问题，任务完成后返回界面仍可看到最终反馈。

### [0.2.3] - 2026-06-10

#### Added / 新增

- Added an AI Coding workspace with a controlled streaming Codex task runner and a manually confirmed web restart action for `scripts/restart-all.sh`.
- 新增 AI 编程界面，支持流式提交与查看 Codex 编程任务，并提供人工确认后调用 `scripts/restart-all.sh` 的网页重启操作。

- Added a desktop sidebar toggle so the left navigation can switch between icon-only and full label modes.
- 新增电脑端左侧导航展开按钮，可在仅图标模式与完整功能名称模式之间切换。

- Added transactional conversion between trusted knowledge and todo items with manual confirmation in both workspaces.
- 新增可信知识与待办事项之间的事务型互转能力，并在两个工作区提供人工确认入口。

- Added quick examples, answer copy, source status, and history-filter handoff to the AI Ask workspace.
- 为 AI 问数界面新增快捷示例、复制回答、回答来源状态，以及跳转历史筛选的核对入口。

- Added deterministic AI Ask condition recognition for date ranges, types, weeks, days, levels, and vector status.
- 为 AI 问数新增确定性条件识别，支持日期范围、类型、周期、星期、等级和向量状态。

#### Changed / 变更

- Changed AI Ask distribution statistics to use full matched result sets instead of representative evidence samples.
- 将 AI 问数的分布统计改为基于全量匹配结果，而不是代表性记录抽样。

- Refined the AI Coding completion card and knowledge archive content so saved records capture concise task outcomes instead of raw Codex logs.
- 优化 AI 编程任务完成卡片与知识库归档内容，使保存记录聚焦精简的任务结论，而不是原始 Codex 日志。

- Changed English Materials detail viewing from a fixed side panel to an in-app dialog for clearer mobile reading.
- 将英语素材详情查看从固定侧栏改为应用内弹窗，提升手机端阅读体验。

- Improved the English Materials detail dialog with explicit open state, previous/next navigation, and copy actions for sentences and scripts.
- 优化英语素材详情弹窗，增加显式打开状态、上一条/下一条切换，以及句式和脚本复制操作。

- Added editing and save support inside the English Materials detail dialog, plus visible copy-success feedback.
- 新增英语素材详情弹窗内的编辑保存能力，并为复制操作增加明确的成功反馈。

#### Fixed / 修复

- Fixed AI Coding result cards and knowledge archives so Codex's actual answer is surfaced before raw output, git status, and restart metadata.
- 修复 AI 编程任务卡片与知识库归档内容，优先展示 Codex 实际答复，而不是原始 Output、Git Status 与重启元数据。

- Fixed mobile PWA viewport drift after editing by preventing input-focus zoom from leaking into the main screen and blocking page-level horizontal scrolling.
- 修复手机端 PWA 编辑后界面缩放状态残留的问题，并禁止页面级左右滑动导致的误操作。

### [0.2.2] - 2026-06-09

#### Added / 新增

- Added an English Materials workspace before AI Ask, backed by `T_DOUYIN_DETAILS`, with controlled material creation and browsing.
- 新增位于 AI 问数前的英语素材管理界面，底层使用 `T_DOUYIN_DETAILS`，支持受控录入与查看素材。

- Added a mobile PWA boot screen and local GET response cache so restored workspaces can render cached data before database-backed refreshes finish.
- 新增手机 PWA 启动加载界面与本地 GET 响应缓存，使恢复后的工作区可先展示缓存数据，再等待数据库接口刷新。

- Added configurable Oracle pool ping, idle timeout, and session lifetime settings for healthier database connection reuse.
- 新增 Oracle 连接池 ping、空闲超时与会话生命周期配置，降低数据库连接复用异常带来的首请求延迟风险。

#### Changed / 变更

#### Fixed / 修复

- Fixed `scripts/commit-to-github.sh` so release changelog rollover is left as a local follow-up change instead of being committed and pushed with the release flow.
- 修复 `scripts/commit-to-github.sh`，发布后的 changelog 下版本占位只保留为本地后续改动，不再随发布流程自动提交并推送。

- Fixed an extra Workbench data fetch that could run while another workspace was active.
- 修复切换到其他工作区时工作台仍可能额外发起数据请求的问题。

### [0.2.1] - 2026-06-05

#### Added / 新增

- Added a shared-entry Todo flow: users can mark a new entry as a todo, store it in the new `AI_TODO_ITEMS` table, and manage todo content and status from a dedicated Todo workspace.
- 新增共享录入的待办事项流程：用户可将新增内容标记为待办，写入新的 `AI_TODO_ITEMS` 表，并在独立待办工作台编辑内容和状态。

- Added PWA app shell caching and UI state restoration so mobile users return to the last workspace, filters, page, selected item, and unsaved inputs after the app is resumed or reloaded.
- 新增 PWA 应用外壳缓存与界面状态恢复，手机端恢复或重新加载后会回到上次的工作区、筛选、页码、选中项和未保存输入。

#### Changed / 变更

- Updated `scripts/commit-to-github.sh` to keep release tags and changelog sections in sync, archive released notes, and open the next patch version automatically.
- 更新 `scripts/commit-to-github.sh`，使发布标签与变更日志版本段落联动，发布后自动归档并开启下一个小版本。

- Updated the LLM Usage view to read server-local CST timestamps directly instead of forcing UTC-to-Asia/Shanghai conversion.
- 更新 LLM 使用情况视图，直接读取服务器本地 CST 时间，不再强制执行 UTC 到 Asia/Shanghai 的前端换算。

- Moved the Current Records add-category panel to the right of the records list.
- 将当前记录录入页的“新增当前分类”面板调整到“当前记录列表”右侧。

#### Fixed / 修复

- Fixed the LLM Usage reset countdown by parsing `NEXT_RESET_AT` as UTC and displaying it in Asia/Shanghai time.
- 修复 LLM 使用情况的重置倒计时，将 `NEXT_RESET_AT` 按 UTC 解析并换算为 Asia/Shanghai 时间展示。

- Fixed the Current Records edit dialog layout so the save button remains reachable on mobile PWA viewports.
- 修复当前记录编辑弹窗在手机端 PWA 视口中“保存内容”按钮可能不可见的问题。

### [0.2.0] - 2026-06-03

#### Added / 新增

- Added database persistence for the Blog Factory copy action. Successful copies are now also stored in the new `AI_BLOG_FACTORY` table for later reuse.
- 为 Blog 加工包的复制操作新增数据库持久化能力。复制成功后，内容也会写入新的 `AI_BLOG_FACTORY` 表，供后续复用。

- Added batch selection and merge support in the Trusted Knowledge Factory. Users can select multiple unpublished knowledge items, edit the merged result, and create one combined unpublished knowledge item.
- 为可信知识加工厂新增批量选择与合并能力。用户可以选择多条未发布知识，编辑合并结果，并生成一条新的合并后未发布知识。

- Added `POST /api/blog-factory` for saving generated Blog Factory task packages.
- 新增 `POST /api/blog-factory`，用于保存生成后的 Blog 加工包任务内容。

- Added a dedicated Blog Factory records workspace for browsing `AI_BLOG_FACTORY` tasks and updating their factory status.
- 新增独立的 Blog 工厂记录工作台，用于查看 `AI_BLOG_FACTORY` 任务并人工更新工厂流转状态。

- Added `GET /api/blog-factory`, `GET /api/blog-factory/{id}`, and `PATCH /api/blog-factory/{id}/status` for controlled task review and status updates.
- 新增 `GET /api/blog-factory`、`GET /api/blog-factory/{id}` 和 `PATCH /api/blog-factory/{id}/status`，用于受控查看任务和更新状态。

- Added Markdown article persistence for Blog Factory records, including article title, file path, checksum, saved time, and a controlled article write-back API.
- 为 Blog 工厂记录新增 Markdown 文章产物持久化能力，包括文章标题、文件路径、校验值、保存时间和受控写回接口。

- Added a Current Records workspace for controlled `T_CURRENT` entry and progress updates, preserving the database trigger flow into `T_HISTORY`.
- 新增当前记录录入工作台，用于受控新增和推进 `T_CURRENT` 记录，并保留数据库触发器同步到 `T_HISTORY` 的流程。

- Added `GET /api/current-records`, `GET /api/current-records/options`, `POST /api/current-records`, and `PATCH /api/current-records/{id}`.
- 新增 `GET /api/current-records`、`GET /api/current-records/options`、`POST /api/current-records` 和 `PATCH /api/current-records/{id}`。

- Added `POST /api/knowledge/merge` for transactional merging of unpublished knowledge items.
- 新增 `POST /api/knowledge/merge`，用于以事务方式合并未发布知识。

#### Changed / 变更

- Updated the Blog Factory copy button to show a saving state and distinguish clipboard failures from database persistence failures.
- 更新 Blog 加工包复制按钮，增加保存中状态，并区分剪贴板复制失败和数据库保存失败。

- Updated the Trusted Knowledge Factory list to support cross-page merge selection while preserving the existing single-item preview and task generation flow.
- 更新可信知识加工厂列表，支持跨分页保留合并选择，同时保留原有单条预览和任务生成流程。

- Updated Current Records and History query filters so type options are scoped to the selected user.
- 更新当前记录和历史记录查询条件，使类型选项随选定用户联动。

#### Fixed / 修复

- Prevented copied Blog Factory tasks from being marked successful unless the database persistence step also succeeds.
- 修复 Blog 加工包只复制成功但数据库保存失败时仍显示为成功的问题；现在只有数据库保存也成功后才标记成功。

- Fixed Oracle DDL quoting for automatic `AI_BLOG_FACTORY` column migrations.
- 修复 `AI_BLOG_FACTORY` 自动补列迁移中的 Oracle DDL 引号转义问题。
