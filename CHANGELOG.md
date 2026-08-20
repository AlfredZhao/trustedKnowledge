# Changelog / 变更日志

All notable changes to this project will be documented in this file.
本文件记录项目中的所有重要变更。

The format follows the common GitHub changelog convention inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
格式遵循 GitHub 常见变更日志规范，并参考 Keep a Changelog。

## 本次版本更新

### [Unreleased]

#### Added / 新增

- Added Web AI Coding activity feedback: the running task now reports its latest Codex event and warns after 60 seconds without output, with the existing cancel action kept available.
- 为 Web AI 编程新增运行活动反馈：任务会显示最近 Codex 事件，60 秒无输出时明确提示可能在等待外部步骤，并保留终止操作。

- Added AI Review to Blog Factory task content. It returns a review conclusion and selectable, safe text-replacement suggestions; applying selections updates only the local draft and opens edit mode, while final persistence remains a manual save.
- 为博客工厂任务内容新增 AI Review：返回审阅结论及可选择的安全文本替换建议；应用后只更新本地草稿并进入编辑模式，最终写入仍需手动保存。

- Added `AI补全` to English Material detail editing. It extracts title, core expression, professional sentence, and Chinese translation from the current full script with an optional Skill, previews the result, fills only blank fields after confirmation, and never saves automatically.
- 在英语素材详情编辑中新增 `AI补全`：可结合可选 Skill 从当前完整口播内容提炼标题、核心表达、职业句式和中文翻译；结果先预览，确认后仅回填空字段，且绝不自动保存。

- Added a mobile PWA collapse control for the Information Entry `录入可信知识` area. It starts expanded and lets users hide the form until they are ready to enter knowledge.
- 为信息录入的手机端 PWA `录入可信知识` 区域新增折叠控件：默认展开，暂不录入时可手动收起，随后可随时继续录入。

#### Changed / 变更

- Changed Web AI Coding prompts to treat the browser run as non-interactive: database/SQLcl, service-control, Git publish/push, and confirmation-required commands are reported for user execution instead of being attempted by the unattended CLI.
- 调整 Web AI 编程提示词：浏览器任务视为非交互执行；数据库/SQLcl、服务控制、Git 发布/推送及需要确认的命令会改为报告给用户执行，避免无人值守 CLI 卡在确认流程。

- Changed Blog Factory AI Review into a top-aligned review workspace with explicit model and Skill selection before review, so long articles no longer hide the dialog and review behavior is configurable.
- 将博客工厂 AI Review 调整为顶部对齐的审阅工作台，审阅前可明确选择模型和 Skill，避免长文章遮挡弹窗并支持后续微调。

- Changed the mobile Information Entry collapse control to sit at the title's upper-right edge; the inline Trust percentage is hidden while the entry area is collapsed.
- 调整信息录入手机端折叠控件至“录入可信知识”标题右上侧；录入区域收起时不再显示内联 Trust 百分比。

- Unified Skill selection in Knowledge Factory, English Materials AI generation, and AI Ask. Each now defaults to the user's own enabled Skills; checking `全部 Skill` reveals permitted shared Skills.
- 统一知识加工、英语素材 AI 生成与 AI 问数的 Skill 选择器：默认仅显示自己的启用 Skill，勾选“全部 Skill”后才显示权限内可调用的共享 Skill。

- Changed Skill scope switching to keep the current selector content visible and cache both scopes, avoiding layout jumps in Knowledge Factory and English Materials AI generation.
- 调整 Skill 范围切换：保留当前选择器内容并缓存两种范围，避免知识加工与英语素材 AI 生成出现布局跳动。

- Added live Unicode character counts and a 6,000-character prompt truncation notice to Skill `SKILL.md` editing and creation.
- 在 Skill `SKILL.md` 在线编辑与新建输入框中新增实时 Unicode 字符统计及 6,000 字符调用截断提示。

#### Fixed / 修复

- Fixed Skill deletion to use the app's styled confirmation dialog instead of the browser's system prompt.
- 修复删除 Skill 时仍使用浏览器系统确认框的问题，现统一使用应用内确认弹窗。

### [0.4.1] - 2026-08-19

#### Added / 新增

- Added `AI生成` to the English Materials `分类标识` options for future AI-generated material workflows.
- 在英语素材 `分类标识` 可选项中新增 `AI生成`，为后续 AI 生成素材功能做准备。

- Added an AI generation flow to English Materials: users can choose an execution model, theme direction, and callable Skills, then review the generated draft before saving it manually.
- 为英语素材新增 AI 生成功能：可选择执行模型、主题方向和可调用 Skill，生成内容只回填草稿，仍需用户手动保存。

#### Changed / 变更

- Changed the current-login username area in the shared top bar into a shortcut back to Overview, including keyboard focus and a descriptive tooltip.
- 将共享顶部栏的当前登录用户名区域改为返回总览的快捷入口，并补充键盘焦点样式和提示说明。

#### Fixed / 修复

- Fixed the English Materials `AI生成` button text contrast in light theme and collapse the desktop material list when opening the generation dialog.
- 修复浅色主题下英语素材 `AI生成` 按钮文字对比度不足的问题；桌面端打开生成弹窗时会收起素材列表。

- Fixed Blog Factory item edits failing with Oracle `DPY-4008`: the task-content row-lock query now receives only its own bind parameters before the final update runs.
- 修复博客工厂编辑任务时的 Oracle `DPY-4008` 保存失败：任务内容行锁查询现在只接收自身所需的绑定参数，再执行最终更新。

### [0.4.0] - 2026-08-19

#### Added / 新增

- Added a mobile English Materials create drawer opened from the list header. It preserves the local draft through closing, failed saves, and PWA refreshes, and offers a “continue entry” action when an unsaved draft exists.
- 为手机端英语素材新增从列表标题区打开的录入抽屉；关闭、保存失败和 PWA 刷新都会保留本地草稿，存在未提交草稿时显示“继续录入”入口。

- Added previous/next task navigation to Knowledge Factory's source-context panel and Blog Factory's task-detail panel. The controls respect the active ordering and continue across page boundaries.
- 为知识加工的知识原文区和博客工厂的任务详情区新增上一条/下一条导航；按钮遵循当前排序，并可跨分页连续切换。

- Added a desktop-only right-collapse rail for the Information Entry workspace. It hides the Knowledge List and Trust Panel together, giving trusted-knowledge editing the full working width.
- 为信息录入工作区新增仅桌面端可用的右侧折叠轨道：可同时收起已录入知识与可信度检查，为可信知识编辑腾出完整工作宽度。

- Added a manual `清理结果` action to failed and manually terminated AI Coding task cards, so their retained output can be hidden without submitting another task.
- 为失败和手工终止的 AI 编程任务卡片新增手动“清理结果”操作，无需提交新任务即可隐藏保留的输出。

#### Changed / 变更

- Changed the AI Coding service-restart confirmation text from `RESTART` to lowercase `restart`.
- 将 AI 编程服务重启的确认文本由大写 `RESTART` 改为小写 `restart`。

- Removed the oversized empty AI Coding task panel when no task output is available, so the project changelog remains reachable without unused vertical space.
- AI 编程没有任务输出或已清空展示时不再显示大面积空状态面板，让项目变更日志无需经过无效垂直占位即可访问。

- Positioned the Overview LLM battery with the right-side desktop actions while retaining its top-right mobile placement; its integer percentage now appears inside the battery.
- 调整总览 LLM 电池在桌面端与右侧操作区对齐，同时保留手机端标题区右侧位置；整数百分比现在显示在电池内部。

- Aligned the desktop Overview Todo and Knowledge panels to the two equal-width metric cards above them.
- 将桌面端总览的 Todo 与可信知识面板调整为与上方两个指标卡一致的等宽双列布局。

- Replaced the Overview LLM metric card with a compact, iPhone-style remaining-budget battery beside the title. It opens AI Usage on tap and turns red below 20% remaining.
- 将总览 LLM 指标卡改为标题旁紧凑的 iPhone 风格剩余额度电池；点击可进入 AI 用量，剩余低于 20% 时显示红色预警。

- Moved the mobile PWA “显示导航 / 隐藏导航” control to the top-right corner of the top bar, so it no longer occupies a separate row.
- 将手机端 PWA 的“显示导航 / 隐藏导航”控件移至顶部栏右上角，不再独占一行空间。

#### Fixed / 修复

- Fixed English material edits containing `full_script` and `sequence_no`: the row-lock query now receives only its own bind parameters, preventing Oracle `DPY-4008` errors.
- 修复英语素材编辑同时包含 `full_script` 与 `sequence_no` 时的保存失败：行锁查询现在仅接收自身所需绑定参数，避免 Oracle `DPY-4008` 错误。

- Fixed English material creation after an ID-preserving migration: startup now advances `T_ENGLISH.ENGLISH_ID`'s identity generator beyond existing rows, preventing `ORA-00001` duplicate primary-key failures.
- 修复英语素材在保留既有 ID 的迁移后无法新增的问题：启动时会将 `T_ENGLISH.ENGLISH_ID` 的 identity 生成器推进到现有记录之后，避免 `ORA-00001` 主键重复。

### [0.3.10] - 2026-08-18

#### Added / 新增

- Added a repeatable Oracle Scheduler deployment script for an every-eight-hours refresh of pending History, English Materials, and Blog Factory vectors, including job-state and run-failure diagnostics.
- 新增可重复执行的 Oracle Scheduler 部署脚本：每 8 小时刷新历史查询、英语素材和博客工厂中待更新的向量，并提供任务状态与失败诊断查询。

- Added vector-status filters and administrator-only manual vector refresh controls to every similarity-search list: History, English Materials, and Blog Factory. The controls invoke their corresponding `PKG_AI_ASSISTANT` refresh procedures and reload the current list on completion.
- 为历史查询、英语素材和博客工厂三个近似检索列表新增向量状态筛选与仅管理员可见的手动向量刷新控件；控件会调用各自的 `PKG_AI_ASSISTANT` 刷新过程，并在完成后重新加载当前列表。

- Added semantic similarity retrieval for English Materials (`T_ENGLISH.full_script`) and Blog Factory (`AI_BLOG_FACTORY.task_content`). Both preserve existing visibility and relational filters, return only current vectors, and display cosine similarity scores.
- 为英语素材（`T_ENGLISH.full_script`）和博客工厂（`AI_BLOG_FACTORY.task_content`）新增语义近似检索；保留既有可见范围与结构化筛选，仅返回当前有效向量，并展示余弦相似度。

- Added repeatable vector-column rollout SQL and `PKG_AI_ASSISTANT` refresh entry points for English Materials and Blog Factory.
- 新增可重复执行的向量列改造 SQL，以及 `PKG_AI_ASSISTANT` 中英语素材和博客工厂的向量刷新入口。

- Added manual semantic similarity search to History Explorer. It embeds the submitted query with `BGE_BASE`, applies the existing visibility and history filters, returns only ready vectors, and shows cosine-similarity scores in relevance order.
- 为历史查询新增手动触发的语义近似搜索：使用 `BGE_BASE` 嵌入查询文本，叠加既有可见范围与历史筛选，仅返回向量就绪记录，并按余弦相似度展示结果。

- Added a merge-ready `PKG_AI_ASSISTANT.refresh_history_vectors` procedure script that centralizes `T_HISTORY` vector refreshes for rows without vectors or marked for re-embedding.
- 新增可合并至 `PKG_AI_ASSISTANT.refresh_history_vectors` 的过程脚本，集中更新 `T_HISTORY` 中未向量化或已标记为待重算的记录。

#### Fixed / 修复

- Fixed backend startup on Oracle databases where `T_ENGLISH.BASE_EXPRESSION` is already nullable: the schema check now consults the column metadata before applying the nullability DDL, avoiding `ORA-01451`.
- 修复 Oracle 数据库中 `T_ENGLISH.BASE_EXPRESSION` 已可空时的后端启动失败：建表检查现在先读取列元数据，再按需修改可空性，避免 `ORA-01451`。

- Fixed History Explorer semantic searches so their query embedding bind is sent only to the vector-result SQL, avoiding Oracle `DPY-4008` failures in the count and summary queries.
- 修复历史查询近似搜索的查询向量绑定仅传入向量结果 SQL，避免总数和摘要查询触发 Oracle `DPY-4008`。

- Added an Overview control for choosing whether recent English shows 1, 3, 5, or 8 records; the default is now 3 records.
- 总览“最近 English”新增显示数量控制，可选 1、3、5 或 8 条，默认显示最近 3 条。

#### Changed / 变更

- Unified the History, English Materials, and Blog Factory similarity-search controls: each now uses an explicit search button, the same filter-header vector refresh action, and a consistent vector-status badge on every result card.
- 统一历史查询、英语素材和博客工厂的近似检索控件：三处均改为显式“搜索”按钮、筛选区标题栏同款向量刷新操作，并在每张结果卡片显示一致的向量状态标签。

- Retired the `T_DOUYIN_DETAILS` compatibility migration after validating its data in `T_ENGLISH`; backend startup and SQL helpers no longer reference the legacy table.
- 已在验证 `T_ENGLISH` 数据完整后下线 `T_DOUYIN_DETAILS` 兼容迁移；后端启动流程与 SQL 辅助脚本不再引用旧表。

- Changed manually stopped AI Coding jobs to use a distinct `cancelled` state, displayed as `任务已终止` rather than a task failure.
- 调整 AI 编程手工终止任务的状态：使用独立的 `cancelled` 状态，界面显示`任务已终止`，不再误报为执行失败。

- Changed the Blog Factory task-content editor so its masking controls are accessed from a compact `脱敏` button in the edit toolbar and expand only on demand.
- 调整博客工厂任务内容编辑区：脱敏控件收纳到编辑工具栏的紧凑`脱敏`按钮中，按需展开。

- Changed the navigation label for `aiGraph` from `AI图谱` to `AI 图谱`; the shared top-bar title updates with it.
- 调整 `aiGraph` 的导航标签：将`AI图谱`更新为`AI 图谱`，复用该标签的顶部标题会同步更新。

- Changed the desktop top bar to derive its Chinese page title from the same navigation labels used in the left sidebar, and compacted desktop-only title spacing without changing the mobile layout.
- 调整桌面端顶部标题栏：中文页面标题直接复用左侧导航标签，并仅压缩桌面端的标题间距与高度，移动端布局保持不变。

- Changed the Information Entry and Skill Management collapse rails to sit on persistent left-workspace frames, keeping the rail visually connected to its panel in both expanded and collapsed states.
- 调整信息录入与 Skill 管理的收起轨道：使其固定依附在左侧工作区外框上，展开与收起时都保持与面板的视觉连接。

- Fixed Information Entry's collapsed desktop grid so the knowledge list and trust panel share and fill the remaining workspace width instead of leaving a fixed-width visual slack area.
- 修复信息录入收起后的桌面网格：已录入知识与可信度面板会共同填满剩余工作区宽度，不再留下固定宽度的视觉留白。

- Changed Information Entry, Knowledge Processing, Todo, Personal Secrets, English Materials, and Skill Management so their desktop `xl` left work panels use the same 28px full-height collapse/restore rail as Blog Factory; mobile keeps the original complete-panel layout.
- 调整信息录入、知识加工、待办事项、个人机密、英语素材和 Skill 管理：桌面 `xl` 左侧工作面板现复用博客工厂的 28px 全高收起/恢复轨道；移动端保持原有完整面板布局。

- Rebalanced the Overview content layout by moving trusted knowledge to the right-hand panel and recent English to a full-width card list below the Todo and knowledge panels.
- 调整总览内容布局：可信知识移至右侧区域，最近 English 调整为 Todo 与可信知识下方的通栏卡片列表。

- Removed the English Materials metric card from the top of Overview; the recent English Materials panel remains available below.
- 移除总览顶部的 English 素材指标卡片；下方最近 English 素材面板仍保留。

- Changed the offline `scripts/export-enhanced-html.mjs` exporter to stay aligned with enhanced Markdown HTML output, including code indentation preservation, H4 headings, and `$$...$$` LaTex formula blocks.
- 调整离线 `scripts/export-enhanced-html.mjs` 导出器与增强美化 Markdown HTML 保持一致，覆盖代码缩进保留、H4 标题和 `$$...$$` LaTex 公式块。

- Changed the Information Entry knowledge-list filters so user and status controls now live in the `已录入知识` panel and are collapsed by default, consistent with other list modules.
- 调整信息录入知识列表筛选：用户与状态控件现位于`已录入知识`面板内，默认折叠，并与其他列表模块保持一致。

- Changed Todo, Current Records, History Explorer, and English Materials query conditions to be collapsed by default, with an on-demand expand control and a compact active-filter count.
- 调整待办事项、当前记录、历史查询和英语素材的查询条件为默认折叠，支持按需展开，并以紧凑数量提示已生效筛选。

- Changed Blog Factory cover-image prompts to an article-recognition format with only title, one-sentence core content, and the desired style. Category and style choices now supply the final style field without appending composition, lighting, material, camera, or quality parameters.
- 调整博客工厂生图提示词为“标题、文章核心内容一句话、想要的感觉”三项文章识别型结构；分类与风格选择只提供最终风格，不再追加构图、灯光、材质、镜头或质量等长参数。

- Changed Blog Factory desktop layout to use full-height clickable rails within the task-list panel: its right-edge rail collapses the open list, and the collapsed rail restores it. The list remains expanded by default.
- 调整博客工厂桌面布局：任务列表切换使用面板内的整条可点击轨道。左侧面板右边缘轨道可收起，收起后的轨道可恢复；默认仍保持展开。

- Changed Blog Factory task query conditions to be collapsed by default and available on demand through an explicit expand control; active filters remain visible as a compact count.
- 调整博客工厂任务查询条件为默认折叠，用户可按需展开；已有筛选会以紧凑数量提示保留可见性。

- Changed the collapsed AI 问数 Skill area to show compact labels for the selected Skill names alongside the selection count.
- 调整 AI 问数收起后的 Skill 区域：除已选数量外，以紧凑标签展示已选择的 Skill 名称。

#### Fixed / 修复

- Fixed Markdown preview, rich copy, and enhanced HTML export so underscores inside identifiers and filenames (such as `v_needs_update` and `my_file_name.md`) are no longer incorrectly rendered as italics; standalone `_emphasis_` remains supported.
- 修复 Markdown 预览、富文本复制与增强 HTML 导出中变量名和文件名（如`v_needs_update`、`my_file_name.md`）里的下划线被误渲染为斜体的问题；独立的`_强调_`语法仍然支持。

- Fixed Markdown code-block rendering and MetaWeblog HTML conversion so leading indentation is preserved instead of collapsing to one space during leaked-placeholder cleanup.
- 修复 Markdown 代码块渲染与 MetaWeblog HTML 转换：清理泄漏占位符时不再将前导缩进压缩为一个空格。

- Fixed intermittent Blog Factory MetaWeblog publish failures caused by a fixed 20-second outbound request limit. Each XML-RPC call now defaults to a configurable 60-second timeout, logs its method and elapsed time without secrets, and reports timed-out new-post results as unknown rather than encouraging an unsafe retry.
- 修复博客工厂 MetaWeblog 因固定 20 秒外部请求上限导致的间歇性发布失败：每个 XML-RPC 调用现默认使用可配置的 60 秒超时，记录不含机密的方法与耗时日志，并将新文章发布超时明确提示为结果未知，避免不安全重试。

- Fixed Blog Factory task-list rails so both the collapse and restore states use the same 28px width.
- 修复博客工厂任务列表轨道宽度不一致的问题：收起和恢复状态现在统一为 28px。

- Refined the collapsed Blog Factory task-list rail so its full height is clickable, letting users restore the list from anywhere on the rail.
- 优化博客工厂收起后的任务列表轨道，使整条轨道均可点击，从任意位置都能恢复任务列表。

- Fixed the expanded AI 问数 Skill cards on mobile PWA so long Skill names, descriptions, and owner names shrink or wrap within the panel instead of overflowing past its right edge.
- 修复 AI 问数移动端 PWA 展开 Skill 后卡片越过右侧边界的问题：较长的 Skill 名称、描述和所有者名称现在会在面板内收缩或换行。

- Fixed the AI 问数 mobile PWA white screen caused by restoring legacy answer data that lacks the current business-domain fields. UI-state storage now uses a new version, legacy answers are discarded safely, and result rendering guards optional response fields.
- 修复 AI 问数移动端 PWA 因恢复缺少当前业务域字段的旧回答而白屏的问题：界面状态存储升级版本，旧回答会被安全丢弃，结果渲染也会保护可选响应字段。

### [0.3.9] - 2026-08-13

#### Added / 新增

- Added an AI Coding `发布并打 Tag` release action. It suggests the next patch version from the latest Changelog release, requires an exact `ok` confirmation, and runs the existing controlled release script with `--version`.
- 为 AI 编程新增 `发布并打 Tag` 发布操作：根据 Changelog 最近版本建议下一个补丁版本，要求精确输入 `ok` 确认，并以 `--version` 调用既有受控发布脚本。

- Added separately persisted Blog Factory assist summary and cover-image metadata. Summaries can be extracted, edited, and saved; cover uploads can be replaced or removed without modifying article Markdown.
- 为博客工厂新增独立持久化的内容辅助摘要与封面图元数据：摘要支持提取、编辑和保存；封面支持上传、替换和移除，不再修改文章 Markdown。

- Added eight Blog Factory category visual presets for 公开课、AI、APEX、Oracle、效率工具箱、英语、Data and Linux. Selecting a category applies its recommended cover-image style while keeping manual style overrides available.
- 为博客工厂新增公开课、AI、APEX、Oracle、效率工具箱、英语、Data、Linux 八类文章的画面风格预设；选择分类会应用推荐封面风格，同时仍可手动覆盖。

#### Changed / 变更

- Changed English Materials `分类标识` to an enum with `影子跟读`、`职场英语`、`生活口语`; new-material drafts default to `职场英语`.
- 调整英语素材 `分类标识` 为 `影子跟读`、`职场英语`、`生活口语` 枚举；新增素材默认选择 `职场英语`。

- Changed English Materials layouts so the `分类标识` and `发布状态` controls use equal-width columns, giving the status label sufficient room.
- 调整英语素材布局：`分类标识` 与 `发布状态` 控件改为等宽列，为发布状态文案保留足够显示空间。

- Changed Skill 管理 so both `新建自定义 Skill` and `上传标准 Skill Zip` panels are collapsed by default and expand on demand.
- 调整 Skill 管理：`新建自定义 Skill` 与 `上传标准 Skill Zip` 面板默认收起，按需展开。

- Fixed the expanded Skill Zip file input so its button and filename text are vertically centered within the full-width control.
- 修复展开后的 Skill Zip 文件选择框：选择按钮与文件名文字在满宽控件内垂直居中显示。

- Changed the Blog Factory task-content copy mode default from `美化` to `增强美化`.
- 将博客工厂任务内容复制模式的默认选择从 `美化` 调整为 `增强美化`。

- Changed Blog Factory summary extraction to use the available 100-character limit instead of targeting roughly 50 characters.
- 调整博客工厂摘要提取：取消约 50 字的目标长度，改为充分使用最多 100 字的限制。

- Fixed Blog Factory assist-save feedback so saving a summary no longer briefly disables or restyles the cover save button, and vice versa. Each action now keeps its own in-flight and result state.
- 修复博客工厂内容辅助保存反馈：保存摘要不再短暂禁用或改变“保存封面”按钮的样式，反之亦然；两个操作各自维护进行中与结果状态。

- Removed source and topic-tag editing from Blog Factory inline task-content editing. Existing metadata remains preserved for publishing, filtering, and send-back processing.
- 从博客工厂内联任务内容编辑中移除来源与主题标签的编辑入口；既有元数据继续保留，用于发布、筛选和发回知识加工。

- Increased the Blog Factory inline task-content editor minimum height from 280px to 420px for more comfortable secondary editing.
- 将博客工厂内联任务内容编辑器的最小高度从 280px 提升至 420px，改善二次编辑时的可视范围。

- Moved Blog Factory task-content editing into the task-content panel. The existing copy, content-assist, cover, and publishing actions remain available; editing now uses an inline Markdown editor with cancel/save actions and collapsed task metadata.
- 将博客工厂任务内容编辑并入任务内容面板；既有复制、内容辅助、封面和发布操作均保留，编辑时原地切换为 Markdown 编辑器，并提供取消/保存与默认折叠的任务元信息。

- Moved Blog Factory query controls above the task list and changed the desktop layout to two columns, giving the task-detail work area more room while keeping filters adjacent to their results.
- 将博客工厂查询条件移至任务列表上方，并将桌面布局调整为两栏；详情工作区获得更多空间，筛选条件也与结果列表保持相邻。

- Widened the Blog Factory desktop task-detail work area while keeping the filter and task list visible for fast task switching during secondary editing.
- 加宽博客工厂桌面端的任务详情主工作区，同时保留筛选和任务列表，便于二次编辑时快速定位与切换任务。

- Changed Blog Factory task-record editing so task content uses the shared Markdown editor with image insertion and clipboard-image upload; question and answer snapshots are no longer shown in that edit area.
- 调整博客工厂任务记录编辑：任务内容复用带图片插入与剪贴板图片上传的 Markdown 编辑器；问题快照与答案快照不再在该编辑区展示。

- Renamed the Blog Factory `Apple哑光极简风` preset to `轻白产品哑光` and removed Apple-brand wording from its prompt, preserving its visual treatment for APEX and other product topics.
- 将博客工厂 `Apple哑光极简风` 更名为 `轻白产品哑光`，并从提示词中移除 Apple 品牌表述；保留其视觉特征，适用于 APEX 等产品主题。

#### Fixed / 修复

- Fixed the Blog Factory mobile filter bar so `清空筛选条件` no longer overflows the PWA viewport; sorting now stacks safely at narrow widths.
- 修复博客工厂移动端筛选栏：`清空筛选条件` 不再超出 PWA 视口；窄屏下排序控件会安全换行。

- Fixed Blog Factory assist-summary and cover-image saves to issue independent partial updates, so they no longer require task content or snapshots to be populated. Save progress, success, and failure now appear directly on the action button.
- 修复博客工厂内容辅助的摘要与封面图片保存：改为独立部分更新，不再要求任务内容或快照字段完整；保存中、成功与失败直接显示在操作按钮上。

- Fixed Blog Factory Chinese summary saves by changing the Oracle summary column to a 100-character definition instead of a 100-byte definition; only the action being saved now shows its transient button state.
- 修复博客工厂中文摘要保存：Oracle 摘要字段改为 100 个字符而非 100 字节；保存时仅被点击的操作按钮显示动态状态。

- Fixed Blog Factory task-list titles so they reflect the saved article title or the current Markdown H1, while clearly labeling the original question when neither is available.
- 修复博客工厂任务列表标题：优先反映已保存文章标题或当前 Markdown 一级标题；两者均不存在时才显示并标识原始问题。

- Fixed Blog Factory assist-summary and cover-image saves so their buttons show an in-progress state and the detail panel confirms successful persistence or surfaces a nearby failure notice.
- 修复博客工厂内容辅助的摘要与封面图片保存：按钮现在会显示保存中，详情区会明确反馈保存成功或就近提示失败。

- Fixed the Blog Factory filter bar so sort-field options and the clear-filter label remain fully visible at desktop and narrow widths.
- 修复博客工厂筛选区的排序字段与清空筛选条件文案在桌面端和较窄宽度下被挤压显示不全的问题。

### [0.3.8] - 2026-08-12

#### Added / 新增

- Added user-owned, domain-scoped quick questions to AI 问数. Users can maintain up to 12 shortcuts per business domain; their saved questions replace the built-in examples for that domain.
- 为 AI 问数新增按用户、业务域隔离的快捷问题维护能力：每个业务域最多维护 12 个快捷问题，保存后会替代该业务域的内置示例。

- Added the `可信知识` and `英语素材` business domains to AI 问数. Both use fixed read-only query adapters, user-visible data boundaries, domain-scoped ontology terms, and the existing SQL/prompt audit view.
- 为 AI 问数新增 `可信知识` 与 `英语素材` 业务域：两者均使用固定只读查询适配器、当前用户可见数据边界、按业务域隔离的本体词条，以及既有 SQL/提示词审计视图。

- Added read-only query auditing to AI 问数: the default no-Skill result now shows the actual matched records (up to the controlled 80-row limit), and users can view the server-generated SQL template, masked bind parameters, and complete prompt context including matched ontology concepts and Skills.
- 为 AI 问数新增只读查询审计：未选择 Skill 的基础结果现在展示实际命中记录（受控上限 80 条），并可查看服务端生成的 SQL 模板、脱敏绑定参数，以及包含命中本体概念和 Skill 的完整提示词上下文。

- Added controlled source-table labels beneath the AI 问数 business-domain selector so users can see the read-only data sources used by each domain.
- 在 AI 问数业务域选择框下新增受控来源表说明，让用户可查看每个业务域使用的只读数据源。

- Added a `清空当前展示` action to completed AI Coding tasks. It hides the current task card without creating a trusted-knowledge archive.
- 为已完成的 AI 编程任务新增“清空当前展示”操作：仅隐藏当前任务卡片，不会创建可信知识归档。

- Added personal, named-user team, and admin-managed system dictionaries to the domain-scoped AI 问数 ontology. Matching resolves duplicate concept names with personal definitions taking precedence over team and system definitions.
- 为按业务域隔离的 AI 问数本体新增个人词典、指定用户名的团队词典和管理员维护的系统词典；同名概念命中时，个人定义优先于团队和系统定义。

- Added a rendered `CHANGELOG.md` panel to AI Coding. It reads the current project file through the existing AI Coding permission boundary, supports manual refresh, and automatically refreshes after a successful GitHub code sync.
- 为 AI 编程新增 `CHANGELOG.md` Markdown 展示区：通过既有 AI 编程权限边界读取当前项目文件，支持手动刷新，并会在 GitHub 代码同步成功后自动更新。

- Added controlled multi-domain AI 问数 for History and Todo data. Users select a business domain while backend adapters retain field allowlists and the existing visible-user boundary; lightweight ontology terms are now domain-scoped.
- 为 AI 问数新增受控多业务域能力，首期支持历史记录与待办事项。用户可选择业务域，后端适配器保持字段白名单和既有可见用户边界；轻量本体词条同步按业务域隔离。

- Added a default data-result view for AI 问数 with no selected Skill, including query metrics, type/week bar charts, and representative records.
- 为未选择 Skill 的 AI 问数新增默认数据结果视图，展示查询指标、类型/周期条形图和代表性记录。

- Added a user-scoped lightweight semantic layer to AI 问数. Users can define business concepts with aliases and an interpretation note; matched aliases expand the evidence query and provide bounded business context to the answer.
- 为 AI 问数新增按用户隔离的轻量语义层：可维护业务概念、别名和口径说明；命中别名会扩展证据检索，并在事实边界内为回答提供业务上下文。

- Added a `引用` action to the shared Markdown toolbar in the trusted-knowledge and Todo editors. It applies or removes the `> ` blockquote syntax for the current line or selection.
- 为“编辑可信知识”和“编辑待办事项”共用的 Markdown 工具栏新增“引用”操作，可为当前行或选区添加或取消 `> ` 引用语法。

#### Changed / 变更

- Changed AI Coding's Codex preset-model list to retain the supported `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` family while keeping `CLI 默认` available.
- 调整 AI 编程的 Codex 预置模型列表：仅保留当前支持的 `gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna` 系列，并继续提供 `CLI 默认`。

- Simplified AI Coding's model area to retain only the execution-model selector. The redundant current CLI-default card and its automatic configuration refresh have been removed.
- 精简 AI 编程的模型区域，仅保留执行模型选择器；移除重复的当前 CLI 默认模型卡片及其自动配置读取。

- Changed AI Coding model information to a compact two-line layout, merged the default-model loading state into that area, and added a configuration refresh action.
- 调整 AI 编程模型信息为两行紧凑展示，并将默认模型读取状态合并到该区域；新增模型配置刷新操作。

- Changed the AI 问数 English heading from `Ask History` to `Ask Data` to reflect its multi-domain data-query capability.
- 将 AI 问数英文标题从 `Ask History` 调整为 `Ask Data`，与当前多业务域问数能力保持一致。

- Changed the AI 问数 workspace to prioritize asking and results: Skill selection, model configuration, and ontology maintenance now default to compact collapsed states; the right rail shows only a concise query summary after execution; SQL and prompt controls are grouped under `审计`; and the empty state now follows the selected business domain.
- 调整 AI 问数工作区的主次关系：Skill 选择、模型配置和本体维护默认以紧凑折叠状态呈现；执行后右侧仅展示查询摘要；SQL 与提示词操作归入“审计”；空状态文案会跟随当前业务域。

- Changed the AI 问数 layout so the business-domain and execution-model selectors sit beside the `自然语言问数` title on desktop. Their source/model explanations now occupy one compact helper row, while mobile automatically stacks the controls beneath the title.
- 调整 AI 问数布局：桌面端“业务域”和“执行模型”选择器移至“自然语言问数”标题右侧；数据来源和模型说明合并为一行紧凑辅助信息，移动端自动堆叠到标题下方。

- Changed shared form controls so standard inputs and dropdowns use the same `h-10` height as adjacent filter/action buttons. This removes uneven controls across Current Records, History, Todo, English Materials, and other pages while retaining explicit compact and multiline controls.
- 统一共用表单控件：标准输入框与下拉框现在使用与相邻筛选/操作按钮一致的 `h-10` 高度。当前记录、历史、待办、英语素材等页面不再出现控件高低不齐；明确使用的紧凑按钮和多行输入框保持原尺寸。

- Changed AI 问数 so its execution-model selector defaults to `CLI 默认` instead of the configured OpenAI-compatible model.
- 调整 AI 问数执行模型选择器：默认值改为 `CLI 默认`，不再默认使用已配置的 OpenAI-compatible 模型。

- Changed Overview and AI Usage budget displays to show amounts with a `$` prefix; the Overview summary now explicitly shows used and remaining amounts.
- 调整总览和 AI 用量的预算展示：金额统一以 `$` 前缀标识美元，总览摘要明确显示“已使用”和“剩余”。

- Moved AI Coding's project CHANGELOG.md panel from the narrow operations sidebar to the bottom of the main task workspace for a wider Markdown reading area.
- 将 AI 编程的项目 CHANGELOG.md 面板从狭窄的右侧操作栏移至左侧主任务区底部，获得更宽的 Markdown 阅读区域。

- Changed the shared Markdown toolbar in the trusted-knowledge and Todo editors so the `Markdown` label occupies its own row and all formatting actions appear below it.
- 调整“编辑可信知识”和“编辑待办事项”共用的 Markdown 工具栏：`Markdown` 标识单独占一行，全部格式化操作显示在下一行。

#### Fixed / 修复

- Fixed AI 编程的 Codex 配置读取请求 so it times out after 6 seconds instead of leaving the loading message visible indefinitely; the UI falls back to its built-in model list and shows the retry control.
- 修复 AI 编程 Codex 配置读取：请求将在 6 秒后超时收敛，不再无限显示加载提示；界面会回退到内置模型列表并提供重试入口。

- Fixed AI 问数的业务记录跳转：不再总是跳转到历史查询。待办、可信知识和英语素材现在会分别打开对应模块，并仅带入该模块支持的筛选条件。
- 修复 AI 问数业务记录跳转：不再无条件跳转到历史记录查询；待办、可信知识和英语素材会分别打开对应模块，并仅带入其支持的筛选条件。

- Fixed AI 问数 ontology migration SQL so default values for visibility and shared-user JSON are correctly escaped inside Oracle dynamic DDL; existing ontology tables can now be upgraded without `ORA-06550` / `PLS-00103`.
- 修复 AI 问数本体迁移 SQL：可见范围和共享用户 JSON 的默认值现在会在 Oracle 动态 DDL 中正确转义，已有本体表升级不再出现 `ORA-06550` / `PLS-00103`。

- Fixed LLM Usage `NEXT_CYCLE_READY` so an exhausted cycle becomes available exactly at `NEXT_RESET_AT`, without an extra one-hour delay after UTC+8 display conversion.
- 修复 LLM 使用情况的 `NEXT_CYCLE_READY`：额度耗尽后会在 `NEXT_RESET_AT` 的准确时刻恢复可用，不再在 UTC+8 展示换算后额外延迟 1 小时。

- Fixed shared Markdown rendering so level-four headings written as `####` are recognized and styled instead of being displayed as literal hash characters.
- 修复共用 Markdown 渲染：`####` 四级标题现在会被识别并按标题样式展示，不再直接显示井号字符。

### [0.3.7] - 2026-08-11

#### Added / 新增

- Added shared execution-model selection to AI 问数: it can now use the enabled OpenAI-compatible configuration or a Codex CLI default/preset model, while preserving the existing evidence-based query boundary and Skill selection.
- 为 AI 问数新增与知识加工一致的执行模型选择：可使用已启用的 OpenAI 兼容配置，或选择 Codex CLI 默认/预设模型；原有基于证据的问数边界和 Skill 选择保持不变。

- Added a compact Markdown formatting toolbar to trusted-knowledge and Todo content editors. It applies heading levels, inline or fenced code, bullet/numbered/task lists, tables, and HTML comments to the current selection (or inserts an editable template at the cursor).
- 为“编辑可信知识”和“编辑待办事项”的正文编辑器新增紧凑 Markdown 格式工具栏：可对当前选区应用标题层级、行内/代码块、无序/有序/任务列表、表格和 HTML 注释；未选中文本时会在光标处插入可继续编辑的模板。

- Added an edit / Markdown preview toggle to the Knowledge entry editor, rendering headings, lists, links, code blocks, tables, and Markdown images before saving.
- 为信息录入的“编辑可信知识”新增编辑 / Markdown 预览切换，可在保存前渲染标题、列表、链接、代码块、表格和 Markdown 图片。

- Added an edit / Markdown preview toggle to Todo task content, rendering headings, lists, links, code blocks, tables, and Markdown images before saving.
- 为待办事项“任务内容”新增编辑 / Markdown 预览切换，可在保存前渲染标题、列表、链接、代码块、表格和 Markdown 图片。

- Added `复制标题` and `复制正文` buttons to Blog Factory enhanced-HTML exports, including the matching offline export script output.
- 为博客工厂增强美化导出的 HTML 新增 `复制标题` 和 `复制正文` 顶部按钮，并同步到离线导出脚本输出。

#### Changed / 变更

- Moved Knowledge Factory model and Skill selectors before the generation action, using dropdown controls; the result panel now focuses solely on generated content.
- 调整知识加工：将执行模型和 Skill 下拉选择移至“生成结果”按钮之前，加工结果区域仅聚焦展示生成内容。

#### Fixed / 修复

- Fixed the shared Markdown toolbar in trusted-knowledge and Todo editors: clicking `表格` again on its selected table now converts it back to plain lines instead of nesting another table, and multi-line `编号` now increments list markers in sequence.
- 修复“编辑可信知识”和“编辑待办事项”的共享 Markdown 工具栏：选中已插入表格后再次点击“表格”会还原为纯文本行，不再嵌套叠加表格；多行使用“编号”时序号会按顺序递增。

- Fixed Markdown editor shortcuts in trusted-knowledge and Todo editors: applying the same heading, list, inline-code, code-block, or HTML-comment action to an already formatted selection now removes that format; line selections ending in a newline no longer format the following line. The toolbar also now uses theme-aware elevated controls with clearer hover, focus, and disabled states.
- 修复“编辑可信知识”和“编辑待办事项”的 Markdown 快捷操作：已应用相同标题、列表、行内代码、代码块或 HTML 注释的选区再次操作时会取消格式；以换行结尾的行选区不再误格式化下一行。工具栏同时改用适配深浅主题的层次化按钮，并改善悬停、聚焦与禁用状态。

- Added a terminate action for running AI Coding tasks. It cancels the current server-side Codex job, stops its subprocess, and releases the user's execution slot when live error output indicates a task will not recover.
- 为执行中的 AI 编程任务新增终止操作：当实时错误输出表明任务无法恢复时，可取消当前服务端 Codex Job、停止其子进程并释放该用户的执行槽位。

- Fixed Knowledge Factory's `其他模型` execution path so it uses the enabled AI 问数 OpenAI-compatible provider configuration (Base URL, configured model, and backend API Key) instead of passing that model name to Codex CLI.
- 修复知识加工的 `其他模型` 执行链路：现在会使用 AI 问数中启用的 OpenAI 兼容供应商配置（Base URL、已配置模型和后端 API Key），不再仅将模型名传给 Codex CLI。

- Fixed the Knowledge Factory action bar so its model, Skill, and generation controls wrap inside the source panel instead of allowing `生成结果` to overflow on desktop layouts.
- 修复知识加工操作区：执行模型、Skill 与“生成结果”会在原文面板内自动换行，避免桌面布局中“生成结果”越界。

- Fixed AI Usage stable-sample folding so unchanged usage periods are no longer split apart by `NEXT_RESET_AT` timestamp drift or serialization differences.
- 修复 AI 用量稳定采样折叠：`NEXT_RESET_AT` 的时间漂移或序列化差异不再把未变化的用量时段重新展开。

### [0.3.6] - 2026-08-08

#### Added / 新增

- Added a Blog Factory send-back action for pending tasks, creating a new unpublished Knowledge Factory item from the current task content and marking the original factory task as skipped.
- 为博客工厂待处理任务新增“发回知识加工”动作：使用当前任务内容创建新的未发布知识加工项，并将原工厂任务标记为跳过。

- Added model selection to Knowledge Factory generation, supporting Codex presets, AI Ask's configured model, and a custom model name.
- 为知识加工生成结果新增模型选择：支持 Codex 预设、AI 问数已配置模型，以及手工输入其他模型名。

- Added Blog Factory cover-image text parsing that extracts distinct core entities from arbitrary input text and builds a C4D cartoon 3D image prompt from those entities.
- 为博客工厂封面生图新增文本解析：支持输入任意文字，自动提取差异化核心实体，并拼接 C4D 卡通 3D 配图提示词。

- Added a personal secrets workspace for storing login credentials with per-user ownership, AES-GCM encrypted username/password/notes fields, searchable metadata, field-level copy, and full-record copy.
- 新增个人机密工作区：支持按当前用户存储登录信息，用户名、密码和备注使用 AES-GCM 加密保存，并提供元数据搜索、字段单独复制和整体复制。

- Added an AI Graph workspace that visualizes current project modules as an interactive frontend graph with grouped entities, relationship highlights, and module jump actions.
- 新增 AI图谱工作区：将当前项目功能模块展示为交互式前端图谱，支持实体分组、关系高亮和模块跳转。

#### Changed / 变更

- Moved the Blog Factory cover-image uploader below the summary and image-prompt results in Content Assist, keeping the lower-frequency action after the primary tools.
- 调整博客工厂“内容辅助”的顺序：将低频的封面图片上传区移至提取摘要和生图提示词结果之后。

- Moved the Blog Factory task-detail shortcuts for summary extraction, image-prompt generation, and blog publishing directly beneath the task-content `美化` / `增强美化` controls; the two assist shortcuts now take the user to the corresponding result area.
- 将博客工厂任务详情的提取摘要、生图提示词和发布到博客快捷操作移至任务内容 `美化` / `增强美化` 控件下方；前两项会自动定位到相应的辅助结果区。

- Changed Knowledge Factory generation so successful Codex results are automatically sent to Blog Factory, while the copy buttons now only copy unless they need to retry a failed save.
- 调整知识加工生成流程：Codex 成功生成后自动发送到博客工厂；复制按钮默认只负责复制，仅在自动保存失败时作为重试入口。

- Changed Personal Secrets detail so it only shows the selected secret summary and copy actions, with add/edit handled in a dedicated dialog.
- 调整个人机密详情：详情区只展示选中机密摘要和复制操作，新增/编辑改为独立弹窗完成。

- Enhanced the Blog Factory cover-image prompt helper with structured configurable subject, composition, style, objects, material, lighting, camera, quality, and negative-prompt options while keeping editable templates.
- 增强博客工厂封面生图提示词辅助：新增主题、构图、风格、元素、材质、灯光、镜头、质量和限制项的结构化配置，同时保留可编辑模板。

- Simplified the Blog Factory cover-image prompt configuration to entity subject, aspect/composition, visual style, key objects, and exclusions, with Chinese UI labels and aspect-ratio-specific prompt wording.
- 精简博客工厂封面生图配置，仅保留实体主题、画幅构图、视觉风格、关键元素和规避内容，界面常规文案改为中文，并在提示词中明确不同画幅构图。

- Changed Blog Factory cover-image prompt generation to support one-click visual style switching across clear business, dark cyber, Apple matte minimal, and warm industrial matte presets, replacing only style, lighting, and material prompt sections.
- 调整博客工厂封面生图提示词生成：新增清透商务、暗黑赛博、Apple 哑光极简、暖调工业哑光四套画面风格一键切换，仅替换风格、灯光、材质三段提示词。

#### Fixed / 修复

- Fixed Blog Factory Content Assist tabs so the full `提取摘要` and `生图提示词` labels remain visible instead of being squeezed or clipped on desktop and mobile.
- 修复博客工厂“内容辅助”切换按钮：桌面端和移动端均完整显示“提取摘要”“生图提示词”文案，不再因宽度压缩而被裁切。

- Fixed the static startup loading screen so its centered indicator no longer creates an unnecessary vertical scrollbar on desktop or mobile; scrolling is unlocked after React mounts.
- 修复静态启动加载页：桌面端和移动端的居中加载动画不再产生无意义的纵向滚动条，React 挂载后会恢复应用内页面滚动。

- Fixed Blog Factory task-detail summary and image-prompt shortcuts so they wait for the selected task's detail load to finish before scrolling, while stale detail requests from previously selected tasks can no longer overwrite the current selection.
- 修复博客工厂任务详情的提取摘要、生图提示词快捷操作：现在会等待当前任务详情加载完成后再定位，同时旧任务的过期详情请求不再覆盖当前选中任务。

- Fixed Personal Secrets creation so username and password are optional, with empty password values stored as missing secrets instead of blocking save.
- 修复个人机密新增：用户名和密码不再必填，空密码会按未记录机密保存，不再阻止保存。

- Fixed Personal Secrets copy actions so copied field buttons and the full-copy button briefly switch to `已复制` after successful clipboard writes.
- 修复个人机密复制反馈：字段复制和整体复制成功后，对应按钮会短暂切换为 `已复制`。

### [0.3.5] - 2026-07-14

#### Added / 新增

- Added `docs/regression-notes.md` for documenting high-risk bug patterns, including the Todo Oracle CLOB binding order issue and its guardrail test.
- 新增 `docs/regression-notes.md`，用于记录高复发风险的 bug 模式；首条记录覆盖 Todo Oracle CLOB 绑定顺序问题及对应防回归测试。

- Added local Markdown image uploads for trusted knowledge and Todo content editors, including file-picker uploads, pasted clipboard images, Oracle-backed media metadata, and opaque `/api/media/.../content` image URLs stored in the Markdown body.
- 为可信知识和 Todo 正文编辑新增本地 Markdown 图片上传能力：支持选择本机图片、直接粘贴剪贴板图片，后端在 Oracle 中记录媒体元数据，并把不可猜测的 `/api/media/.../content` 图片地址写入 Markdown 正文。

- Added Blog Factory task-content assist actions for extracting an approximately 50-character summary capped at 100 characters and producing a copyable C4D cover-image prompt with 16:9 / 2.35:1 composition guidance.
- 为博客工厂任务内容新增辅助操作：可提取约 50 字且不超过 100 字的摘要，并生成可复制的 C4D 封面图提示词，包含 16:9 / 2.35:1 构图建议。

- Added an editable Blog Factory cover-image prompt template with `{{title}}`, `{{summary}}`, and `{{topic}}` placeholders, persisted in the browser UI state and restorable to the default template.
- 为博客工厂封面生图提示词新增可编辑模板，支持 `{{title}}`、`{{summary}}`、`{{topic}}` 占位符，模板会保存在浏览器 UI 状态中，也可恢复默认模板。

- Added a Blog Factory cover image area inside task-content assist actions, supporting file upload or pasted clipboard images through the existing media storage flow and writing the cover image back into the task-content draft as Markdown.
- 为博客工厂任务内容辅助区新增封面图片区域，支持上传文件或粘贴剪贴板图片，图片仍走现有媒体存储链路，并以 Markdown 图片格式写回任务内容草稿。

#### Changed / 变更

- Changed the project development guide to require regression-note entries for bug fixes with meaningful recurrence risk.
- 调整项目开发规范：修复存在明显复发风险的 bug 时，需要同步补充防回归记录。

- Removed the Blog Factory title-candidate assist action, leaving the content assist area focused on summary extraction, cover image handling, and cover prompt generation.
- 移除博客工厂标题候选辅助操作，让内容辅助区聚焦摘要提取、封面图片处理和封面提示词生成。

- Moved the Blog Factory task-content preview, copy, assist, and publishing area to the top of the task detail panel.
- 将博客工厂任务详情中的任务内容预览、复制、辅助和博客发布区域调整到详情面板最上方。

#### Fixed / 修复

- Fixed Blog Factory MetaWeblog publishing for local Markdown images by uploading `/api/media/.../content` assets through `metaWeblog.newMediaObject` before publishing, then replacing the article Markdown with the remote image URLs returned by the blog platform.
- 修复博客工厂 MetaWeblog 发布本地 Markdown 图片的问题：发布前会先通过 `metaWeblog.newMediaObject` 上传 `/api/media/.../content` 图片资源，再用博客平台返回的远端图片 URL 替换正文中的本地链接。

- Fixed the desktop Todo workspace editor sizing so the `待办事项列表` panel is narrower, the `编辑待办事项` panel is wider, and the `任务内容` editor is taller for more comfortable multi-line editing.
- 修复待办事项工作台的桌面端编辑区尺寸：缩窄 `待办事项列表` 面板、加宽 `编辑待办事项` 面板，并提高 `任务内容` 编辑框高度，让多行内容编辑更顺手。

- Fixed Todo completion handling so failures while preparing or confirming the `追加已完成待办` dialog no longer appear as `保存待办事项` failures after the Todo update itself has succeeded.
- 修复 Todo 完成后的提示归属：准备或确认 `追加已完成待办` 弹窗失败时，不再显示成 `保存待办事项` 失败，避免保存已成功却被误报为保存报错。

- Fixed Todo save handling for transient browser-side `Failed to fetch` errors by retrying the idempotent update request once and replacing the raw browser message with a clearer backend connectivity prompt if it still fails.
- 修复 Todo 保存遇到浏览器侧短暂 `Failed to fetch` 或长时间无响应的处理：对幂等更新请求自动重试一次，并为保存请求增加 15 秒超时；若仍失败，改为提示后端连接/响应异常，而不是直接暴露浏览器原始报错或让按钮一直停在保存中。

- Fixed Todo updates for records locked by another Oracle transaction by acquiring the row with `for update wait 5` before writing and returning a clear conflict message instead of letting one locked item keep the save button spinning.
- 修复某条 Todo 被其它 Oracle 事务锁住时保存一直转圈的问题：写入前先用 `for update wait 5` 获取行锁，锁等待超时会返回明确冲突提示，而不是让单条记录无限保存中。

- Fixed Todo create/update persistence for SQL-heavy or diagnostic text by binding `title` and `content` explicitly as Oracle CLOBs and adding the same 15-second timeout guard to Todo creation.
- 修复包含 SQL 片段、诊断日志等文本的 Todo 新建/更新保存问题：`title` 和 `content` 明确按 Oracle CLOB 绑定写入，并为新建 Todo 也增加 15 秒超时保护。

- Fixed Todo partial updates so Oracle CLOB input sizes are declared only for fields present in the generated update SQL and only immediately before that update executes, avoiding `DPY-4008` errors during the row-lock query.
- 修复 Todo 局部更新的 Oracle CLOB 绑定：现在只会为本次更新 SQL 中实际出现的字段声明输入类型，并且只在真正执行更新前声明，避免行锁查询阶段触发 `DPY-4008`。

- Fixed the Overview `处理中 Todo` and `未发布知识` metric cards so they show exact totals while their lists still render only the latest cards.
- 修复总览 `处理中 Todo` 和 `未发布知识` 指标卡：顶部数字改为显示精确总数，列表仍只展示最近几条卡片。

- Fixed `scripts/commit-to-github.sh` release mode so it now promotes the `Unreleased` notes into the requested version instead of renaming the previous release section, then reopens a blank local `Unreleased` block after the tag push.
- 修复 `scripts/commit-to-github.sh` 的发布逻辑：发布时现在会把 `Unreleased` 变更提升为目标版本，而不是把上一版的版本标题直接改名；推送 tag 后再在本地重新打开空白 `Unreleased` 区块。

### [0.3.4] - 2026-07-10

#### Changed / 变更

- Clarified the project development guide so future Codex tasks must update the active changelog section, scan related modules for shared UI patterns, keep user-scoped filter resets aligned with each module's default visible scope, and explicitly call out any required restart, reload, cache-clear, or migration commands in the final handoff.
- 调整项目开发规范：后续 Codex 任务需要写入当前进行中的变更日志区，修复 UI 时同步扫描同类模块，用户域模块的筛选重置需回到该模块默认可见范围，并在最终交付中明确写出所有必要的重启、重载、清缓存或迁移命令。

- Changed the frontend build output to split React, icon, and shared vendor code into separate chunks, reducing the main application bundle size so refreshes can reuse more cached assets instead of re-downloading one large script.
- 调整前端构建产物拆包方式：将 React、图标库和共享依赖拆成独立 chunk，减少主应用包体积，让页面刷新时可以复用更多已缓存资源，而不是反复下载单个大脚本。

- Changed the frontend shell to lazy-load the Overview, LLM Usage, History, and AI Coding views, while extracting shared metric, loading-card, and form-field primitives out of `App.tsx`, further shrinking the main entry chunk and reducing initial parse work.
- 调整前端工作台装载方式：总览页、LLM 用量页、历史查询页和 AI 编程页改为懒加载，同时把共享指标卡、骨架屏和表单字段基元从 `App.tsx` 抽离，进一步缩小主入口 chunk，并降低初始解析负担。

#### Fixed / 修复

- Fixed the AI Coding completion summary on mobile portrait screens so the `重启判断` and `变更文件` cards now shrink within the viewport instead of overflowing past the right edge when long file paths are present.
- 修复 AI 编程完成摘要在手机竖屏下的横向溢出：`重启判断` 与 `变更文件` 卡片现在会在视口内收缩，长文件路径不再把右侧内容顶出屏幕边缘。

- Fixed the mobile PWA layout of the Current Records filter bar so the `清空筛选条件` button now wraps onto its own row instead of being squeezed beside the sort dropdowns.
- 修复当前记录列表筛选条在手机端 PWA 中的排版：`清空筛选条件` 按钮现在会独立换到下一行，不再和排序下拉框挤在一起。

- Fixed Oracle list-filter performance for history and current records by resolving requested usernames to `user_id` before querying, so the backend can use direct user-based predicates instead of `coalesce(...username...)` filters that forced poorer plans.
- 修复历史查询与当前记录列表的 Oracle 过滤性能问题：后端现先将用户名解析为 `user_id` 再查询，避免继续使用 `coalesce(...username...)` 这类不利于优化器走索引的过滤条件。

- Fixed database indexing gaps for user-scoped list pages by ensuring composite indexes for knowledge, todo, English materials, history, current records, and relation child lookups are created alongside existing runtime schema checks.
- 修复按用户筛选列表页的数据库索引缺口：运行时 schema ensure 现会补齐知识库、Todo、英语素材、历史、当前记录以及关系子节点查询所需的组合索引，减少首屏和筛选请求的全表扫描风险。

- Fixed Overview dashboard query weight by switching its usage, todo, knowledge, and English-material requests to lightweight reads that skip exact `count(*)` totals and only load the recent cards the page actually renders.
- 修复总览页查询负载偏重的问题：总览使用的用量、Todo、知识库和英语素材请求现改为轻量读取，不再为首页卡片额外执行精确 `count(*)`，只加载页面实际展示的最近几条数据。

- Fixed redundant same-path GET requests in the frontend API client by deduplicating in-flight reads and pruning oversized local API caches, reducing repeated refresh traffic and localStorage pressure on list and dashboard pages.
- 修复前端 API 客户端的同路径 GET 重复请求与本地缓存膨胀问题：现在会合并进行中的相同读取请求，并裁剪过大的本地 API 缓存，降低列表页与总览页重复刷新时的网络流量和 localStorage 压力。

- Fixed refresh responsiveness for static frontend assets by switching the service worker to network-first HTML loading with background asset revalidation, while memoizing Markdown preview HTML generation to avoid repeated parsing during unrelated state updates.
- 修复前端刷新与展示响应中的两处性能损耗：service worker 现改为 HTML 网络优先、静态资源后台更新，减少刷新时拿到旧壳或二次等待；Markdown 预览改为按内容记忆化，避免无关状态更新时反复解析同一段文本。

### [0.3.3]

#### Added / 新增

- Added an explicit model selector to the AI Coding workspace, plus backend Codex config exposure so the frontend can show the current CLI default model instead of guessing.
- 为 AI 编程工作台新增显式模型选择器，并增加后端 Codex 配置读取接口，让前端可以展示当前 CLI 默认模型，而不是自行猜测。

#### Changed / 变更

- Changed AI Coding task submissions and result cards to carry the effective Codex model name end to end, while persisting the user's last model selection in browser UI state.
- 调整 AI 编程任务提交与结果卡片的模型链路：前后端现在会贯通记录本次实际使用的 Codex 模型名称，同时把用户上次选择的模型持久化到浏览器 UI 状态。

#### Fixed / 修复

- Fixed AI Coding form select controls so fixed-height dropdowns such as `执行模型` no longer clip the lower half of the option text.
- 修复 AI 编程表单下拉框的文字裁切问题：像 `执行模型` 这类固定高度选择框不再出现选项文字下半部分被遮挡。

- Clarified the Current Records filter reset action by renaming its `清空` button to `清空筛选条件`, making the button intent explicit without changing behavior.
- 调整“当前记录”模块筛选重置按钮文案：将 `清空` 改为 `清空筛选条件`，仅增强语义，不改变原有清空行为。

- Fixed list filter clear buttons across Current Records, Todo, English Materials, Blog Factory, and History so they share one compact icon style aligned with adjacent controls.
- 统一当前记录、待办事项、英语素材、博客工厂和历史查询筛选区的清空按钮：改为与相邻控件对齐的紧凑图标按钮，避免单个按钮尺寸显得突兀。

- Standardized remaining filter reset labels so buttons previously shown as `清空` or `清空条件` now all read `清空筛选条件` across modules.
- 统一各模块筛选重置按钮文案：原来显示为 `清空` 或 `清空条件` 的按钮，现统一改为 `清空筛选条件`。

- Fixed delayed filter reset feedback on list pages by making cleared search terms bypass debounce, so `清空筛选条件` now refreshes Todo, Current Records, English Materials, Blog Factory, and History results immediately.
- 修复列表页筛选重置反馈延迟的问题：搜索词被清空时现在会跳过防抖，`清空筛选条件` 在待办事项、当前记录、英语素材、博客工厂和历史查询页都会立即刷新结果，不再看起来像“点了没反应”。

- Unified the user-reset behavior behind `清空筛选条件`: Blog Factory, Todo, English Materials, Current Records, and History now clear back to `全部可见用户`/`全部用户`, while single-user scopes still stay locked to that only visible user.
- 统一 `清空筛选条件` 的用户重置语义：博客工厂、待办事项、英语素材、当前记录和历史查询现在都会回到 `全部可见用户` / `全部用户`；仅当当前账号本来只可见一个用户时，才保持该唯一用户不变。

## 历史版本更新

### [0.3.2] - 2026-07-05

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
