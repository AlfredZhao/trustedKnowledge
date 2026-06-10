# Changelog / 变更日志

All notable changes to this project will be documented in this file.
本文件记录项目中的所有重要变更。

The format follows the common GitHub changelog convention inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
格式遵循 GitHub 常见变更日志规范，并参考 Keep a Changelog。

## 本次版本更新

### [0.2.4]

#### Added / 新增

#### Changed / 变更

#### Fixed / 修复

## 历史版本更新

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
