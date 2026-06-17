# Changelog / 变更日志

All notable changes to this project will be documented in this file.
本文件记录项目中的所有重要变更。

The format follows the common GitHub changelog convention inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
格式遵循 GitHub 常见变更日志规范，并参考 Keep a Changelog。

## 本次版本更新

### [0.2.5]

#### Added / 新增

- Added an Overview dashboard that brings together LLM usage, processing Todo items, recent English material, and trusted knowledge signals.
- 新增总览 Dashboard，集中展示 LLM 用量、处理中待办、最近 English 素材和可信知识状态。

- Added rendered Markdown viewing and mode-aware copying for AI Ask answers, with rich HTML clipboard output in rendered mode.
- 为 AI 问数回答新增 Markdown 美化展示和按模式复制，美化模式下复制富文本 HTML。

- Added shared Markdown preview and clipboard utilities so future Markdown surfaces can reuse the same rendered display and document-friendly rich-copy behavior.
- 新增通用 Markdown 预览组件与复制工具，后续 Markdown 界面可复用同一套美化展示和文档友好的富文本复制行为。

- Added a Todo completion prompt that can prepend completed task details to a selected Current Record by user and type.
- 为待办事项完成保存新增追加提示，可按用户和类型选择当前记录，并将任务详情前置追加到 CONTENT。

#### Changed / 变更

- Updated the navigation and related entry copy from `知识录入` to `信息录入`.
- 将导航及相关录入提示文案从 `知识录入` 调整为 `信息录入`。

#### Fixed / 修复

- Fixed Overview refresh feedback and partial-load handling so the refresh action shows progress and one failed data source no longer blocks the whole dashboard.
- 修复总览刷新反馈与局部加载处理，点击刷新会显示进度，单个数据源失败不再阻断整个 Dashboard。

- Added mobile editor sheets for Information Entry and Todo items so tapping a list item in the PWA opens the edit view directly.
- 为信息录入和待办事项新增手机端编辑弹层，PWA 中点击列表条目会直接打开编辑界面。

## 历史版本更新

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
