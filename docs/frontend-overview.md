# 前端界面与展示配置概览

最近评估日期：2026-06-18

本文档维护当前前端界面布局、已实现功能，以及可以安全手工调整的纯前端展示配置。后续如果前端导航、页面布局、模块可见性、默认展示数量、分页方式或纯展示行为发生变化，需要在同一次变更中更新本文档。

## 入口与总体结构

- 前端技术栈：React 19 + Vite + TypeScript + Tailwind CSS + lucide-react icons。
- 主入口：`frontend/src/main.tsx`。
- 主要实现：`frontend/src/App.tsx`。
- 全局样式：`frontend/src/styles.css`。
- API 封装：`frontend/src/api/*.ts`。
- Markdown 渲染：`frontend/src/components/MarkdownPreview.tsx` 和 `frontend/src/utils/markdown.ts`。

当前前端大部分逻辑集中在一个较大的 `App.tsx` 文件中。它同时承载导航、状态恢复、数据加载、视图切换和大部分页面组件。项目没有使用 React Router；当前工作区由 `activeView` 控制，并持久化到 localStorage 的 `trustedKnowledge.uiState.v1`。

整体视觉是深色工作台风格：

- 背景：`ink-950` / `ink-900` 深色面板，搭配低饱和 mint 强调色。
- 面板：主要使用 8px `rounded-lg`、半透明白色边框和克制阴影。
- 布局：桌面端是固定左侧栏 + 顶部栏；移动端隐藏侧栏，在顶部栏中展示网格导航。
- 表单控件：统一使用 `styles.css` 中的 `.control`，移动端输入字号固定为 16px，避免 iOS 自动放大。
- 图标：导航、按钮、状态和空状态统一使用 lucide-react。

## 导航模型

导航项由 `frontend/src/App.tsx` 中的 `FUNCTION_NAV_ITEMS` 定义。

| View key | 页面名称 | 主要用途 |
| --- | --- | --- |
| `overview` | 总览 | 聚合 LLM 用量、Todo、英语素材和可信知识的 Dashboard。 |
| `workbench` | 信息录入 | 新增/编辑可信知识，也可以用同一个录入表单新增 Todo。 |
| `factory` | 知识加工 | 选择未发布知识和 Skill，生成 Codex 加工结果。 |
| `blogFactory` | 博客工厂 | 查看已保存的博客工厂任务、状态、Markdown 文章和快照。 |
| `todos` | 待办事项 | 列表、筛选、编辑、复制、转换 Todo 记录。 |
| `currentRecords` | 当前记录 | 管理当前学习记录，编辑 week/day/content 进度。 |
| `history` | 历史查询 | 筛选、排序、查看历史记录和详情元数据。 |
| `englishMaterials` | 英语素材 | 新增、列表、筛选、编辑和复制英语素材。 |
| `skills` | Skill 管理 | 创建、上传、编辑、删除 Skill 包和文件。 |
| `historyAsk` | AI 问数 | 基于历史记录做自然语言问答，可选择 Skill 和配置 LLM。 |
| `aiCoding` | AI 编程 | 提交 Codex 编程任务，查看最近任务结果和状态。 |
| `usage` | AI 用量 | 查看 LLM 用量采样和重置状态。 |

桌面侧栏：

- Visible at `lg` and above.
- Can collapse to icon-only mode.
- `AI 用量` is placed as a bottom utility entry.
- 当前有两个仅展示的工具按钮：`Review` 和 `Sources`，没有切换视图的行为。

移动端顶部导航：

- 以 2 列或 3 列按钮网格展示所有 `FUNCTION_NAV_ITEMS`。
- 在没有桌面侧栏时，仍然保持核心导航可访问。

顶部搜索：

- 在 `overview`、`usage`、`historyAsk`、`aiCoding` 中隐藏。
- 在数据列表类页面中显示，并写入对应页面的 query 状态。
- `workbench` 额外在顶部栏提供状态筛选。

## 主要页面

### 总览 / `OverviewDashboard`

布局：

- 顶部显示刷新按钮和最后更新时间。
- 四个指标卡片：
  - LLM 用量
  - 处理中 Todo
  - 未发布知识
  - English 素材
- 主体网格：
  - 左侧：`处理中 Todo` 卡片列表。
  - 右侧：`最近 English` 单张重点卡片。
- 底部通栏：
  - `可信知识` 最近知识卡片。

数据来源：

- `fetchLlmUsage(USAGE_SAMPLE_LIMIT)`
- `fetchTodos({ status: "处理中", limit: OVERVIEW_TODO_LIMIT, offset: 0 })`
- `fetchKnowledge({ limit: OVERVIEW_KNOWLEDGE_LIMIT, offset: 0 })`
- `fetchKnowledge({ status: "未发布", limit: OVERVIEW_KNOWLEDGE_LIMIT, offset: 0 })`
- `fetchEnglishMaterials({ sortBy: "id", sortDir: "desc", limit: 1, offset: 0 })`

当前行为：

- 总览内各模块目前不分页。
- 总览 Todo 只显示 `处理中` 状态。
- English 模块只显示最新 1 条。
- 可信知识模块使用 `OVERVIEW_KNOWLEDGE_LIMIT` 控制最近知识卡片数量。
- 分区失败会独立展示错误，一个数据源失败不会阻断整个总览。
- 点击卡片会跳转到对应完整工作区，并在支持的页面中选中对应记录。

### 信息录入 / `workbench`

桌面布局:

- 主网格包含知识表单、知识列表和可信度面板。
- 在 `xl` 断点变为 3 列：表单、列表、可信度面板。
- 低于 `xl` 时，面板会折叠为更少列。

功能:

- 新增可信知识。
- 新增时可勾选 `这是待办事项`，写入 Todo 而不是可信知识库。
- 编辑选中的可信知识。
- 二次确认后删除选中的可信知识。
- 将选中的可信知识转为 Todo。
- 支持上一条/下一条，并可跨当前分页边界切换。
- Trust 分数和敏感信号由前端基于草稿内容计算。

列表行为:

- 服务端分页。
- 默认每页数量：`PAGE_SIZE = 5`。
- 状态筛选：`全部状态`, `未发布`, `已发布`, `跳过`。

移动端行为:

- 选择知识条目会打开移动端编辑弹层，列表和编辑动作都保持可达。

### 知识加工 / `factory`

桌面布局:

- 左侧：未发布知识队列。
- 中间：选中知识的原文上下文。
- 右侧：Skill 选择和生成结果。

功能:

- 只列出 `未发布` 知识。
- 支持搜索。
- 支持多选和合并所选知识。
- 生成前必须显式选择 Skill。
- 生成时以 read-only 模式运行 Codex。
- 生成结果支持 Markdown 美化展示和裸文本展示。
- 生成结果会清理泄漏的 Markdown 内部代码占位符，避免 `@@CODE0@@` 或私有 Unicode 包裹的 `CODE0` 这类标记进入展示、复制或保存内容。
- 复制动作可复制富文本 Markdown 或裸文本，并保存博客工厂任务。

列表行为:

- 服务端分页。
- 默认每页数量：`FACTORY_PAGE_SIZE = 6`。

### 博客工厂 / `blogFactory`

桌面布局:

- 左侧：筛选条件。
- 中间：任务列表。
- 右侧：任务详情、工厂状态动作、Markdown 文章编辑和快照。

功能:

- 按工厂状态、主题标签、知识 ID 筛选。
- 按复制时间、ID、知识 ID 或工厂状态排序。
- 更新工厂状态：`待处理`, `已处理`, `已发布`, `跳过`。
- 编辑并保存 Markdown 文章正文和文件路径。
- 复制 Markdown 文章。
- 查看任务内容，并可选择复制 Markdown 美化富文本或裸文本；查看问题快照、答案快照、来源和标签。

列表行为:

- 服务端分页。
- 默认每页数量：`BLOG_FACTORY_PAGE_SIZE = 8`。

### 待办事项 / `todos`

桌面布局:

- 左侧：Todo 列表和状态筛选。
- 右侧：选中 Todo 的详情编辑器。

功能:

- 通过顶部搜索检索 Todo 标题、内容或标签。
- 按状态筛选：`全部状态`, `待处理`, `处理中`, `已完成`。
- 编辑任务目标、任务内容、来源、标签和状态。
- 复制当前 Todo 标题和内容。
- 将选中 Todo 转为可信知识。
- 支持上一条/下一条，并可跨当前分页边界切换。

列表行为:

- 服务端分页。
- 默认每页数量：`TODO_PAGE_SIZE = 8`。
- 待办事项主页面分页。
- 总览 Todo 模块是独立展示区，不分页，数量由 `OVERVIEW_TODO_LIMIT` 控制。

移动端行为:

- 选择 Todo 会打开移动端编辑弹层。

### 当前记录 / `currentRecords`

桌面布局:

- 左侧：当前记录列表和筛选条件。
- 中间：新增当前分类表单。
- 右侧：同步规则说明面板。
- 编辑使用弹窗。

功能:

- 按用户、类型、week、day、学习等级筛选。
- 按 ID、类型、week、day、用户或等级排序。
- 为用户创建新的当前记录类型。
- 编辑选中记录的 week/day/content。
- 展示数据库触发器规则，并明确删除动作未开放。

列表行为:

- 服务端分页。
- 默认每页数量：`CURRENT_RECORDS_PAGE_SIZE = 10`。

### 历史查询 / `history`

功能:

- 搜索历史内容。
- 按类型、用户、week、day、等级、向量更新状态和日期范围筛选。
- 按历史日期、ID、类型、用户或等级排序。
- 打开详情弹窗查看完整内容和元数据。

列表行为:

- 服务端分页。
- 默认每页数量：`HISTORY_PAGE_SIZE = 10`。

### 英语素材 / `englishMaterials`

桌面布局:

- 左侧：素材列表和筛选条件。
- 右侧：新增素材表单。
- 详情编辑使用弹窗。

功能:

- 搜索标题、分类、英文内容或中文内容。
- 按分类和发布状态筛选。
- 按 ID、序号、分类、基础表达、标题或发布状态排序。
- 新增素材。
- 根据当前最大序号自动填充下一个序号。
- 打开详情弹窗编辑并复制字段。
- 在当前已加载页面内支持上一条/下一条。

列表行为:

- 服务端分页。
- 默认每页数量：`ENGLISH_MATERIALS_PAGE_SIZE = 10`。

### Skill 管理 / `skills`

功能:

- 搜索 Skills。
- 创建自定义 Skill。
- 上传标准 Skill zip 包。
- 编辑 Skill 元数据。
- 编辑单个可编辑 Skill 文件。
- 删除选中 Skill。
- 文件夹列表默认折叠，按需展开。

`historyAsk` 和 `factory` 也会加载 Skill 数据，但这两个页面只拉取已启用的 Skills。

### AI 问数 / `historyAsk`

功能:

- 基于历史记录进行自然语言问答。
- 提问时可选择已启用的 Skills。
- 回答支持 Markdown 美化展示和裸文本模式。
- 可复制富文本 Markdown 或裸文本。
- 可使用回答返回的筛选条件打开历史查询页。
- 可查看和编辑 OpenAI-compatible LLM 配置，API key 由后端环境配置处理。

### AI 编程 / `aiCoding`

功能:

- 通过后端 job API 提交 Codex 任务。
- 页面刷新后恢复最近一次任务。
- 轮询当前 Codex job 状态。
- 离开 AI 编程页时，在全局顶部栏显示执行中/已完成/失败提示。
- 归档任务消息。
- 通过后端 API 触发 GitHub 同步，并保留最近一次同步日志尾部。
- UI 中存在服务重启相关控件，但项目规则要求涉及真实进程状态的操作由用户手工执行。

### AI 用量 / `usage`

功能:

- 加载最近的 LLM 用量采样。
- 展示最新用量、剩余额度、重置时间和趋势。
- 将重复稳定的用量快照折叠为更有意义的变化区间。
- 支持手动刷新。

展示数量:

- 默认采样数量：`USAGE_SAMPLE_LIMIT = 72`。

## 纯前端展示配置点

这些配置目前是 `frontend/src/App.tsx` 顶部附近的常量。

| 常量 | 当前值 | 影响范围 | 是否分页 | 备注 |
| --- | ---: | --- | --- | --- |
| `PAGE_SIZE` | 5 | 信息录入知识列表 | 是 | 也影响上一条/下一条跨页切换逻辑。 |
| `FACTORY_PAGE_SIZE` | 6 | 知识加工未发布队列 | 是 | 用于列表范围显示和后端 `limit`。 |
| `BLOG_FACTORY_PAGE_SIZE` | 8 | 博客工厂任务列表 | 是 | 用于列表范围显示和后端 `limit`。 |
| `TODO_PAGE_SIZE` | 8 | 待办事项主列表 | 是 | 这是待办事项主页面默认展示数量。 |
| `CURRENT_RECORDS_PAGE_SIZE` | 10 | 当前记录列表 | 是 | 用于列表范围显示和后端 `limit`。 |
| `ENGLISH_MATERIALS_PAGE_SIZE` | 10 | 英语素材列表 | 是 | 用于列表范围显示和后端 `limit`。 |
| `HISTORY_PAGE_SIZE` | 10 | 历史查询列表 | 是 | 用于列表范围显示和后端 `limit`。 |
| `USAGE_SAMPLE_LIMIT` | 72 | 总览和 AI 用量采样 | 无分页 UI | 数量越多，趋势图可能越密。 |
| `OVERVIEW_TODO_LIMIT` | 5 | 总览 `处理中 Todo` 卡片 | 否 | 状态固定为 `处理中`。 |
| `OVERVIEW_KNOWLEDGE_LIMIT` | 5 | 总览最近知识和未发布知识请求 | 否 | 最近知识卡片使用该值；未发布知识总数来自查询响应的 `total`。 |

手工修改示例:

- 如果要让待办事项主页面每页显示 12 条，把 `TODO_PAGE_SIZE` 从 `8` 改成 `12`。
- 如果要让总览 Todo 模块显示 8 张卡片，把 `OVERVIEW_TODO_LIMIT` 从 `5` 改成 `8`。
- 如果要让总览最近知识显示 9 张卡片，把 `OVERVIEW_KNOWLEDGE_LIMIT` 从 `5` 改成 `9`。
- 如果要让信息录入知识列表每页只显示 3 条，把 `PAGE_SIZE` 从 `5` 改成 `3`。

修改这些常量后:

- 可行时运行 `cd frontend && npm run build`。
- 检查桌面端和移动端布局，因为卡片数量变化会影响页面高度、密度和滚动。
- 如果改变的是行为而不只是数字，也要同步更新本文档。

## 分页说明

大多数列表页面使用服务端分页:

- 前端发送 `limit` 和 `offset`。
- 后端响应包含 `items` 和 `total`。
- 前端本地计算当前范围和总页数。

总览页面不同:

- 它是紧凑 Dashboard。
- 每个模块只拉取第一段数据。
- 当前没有分页控件。
- 给总览某个模块增加分页不只是改数字：需要增加该模块的页码状态、计算 `offset`、渲染分页控件，并决定点击卡片跳转后是否保留总览页码状态。

## 搜索、筛选与排序

搜索输入防抖:

- 大多数列表页会先对搜索文本做防抖，再触发加载。
- 搜索条件变化时，页码通常重置为 1。

本地保存的 UI 状态:

- 当前视图、筛选条件、页码、选中 ID、草稿、已选 Skills、AI 回答、Codex 消息都会持久化到 localStorage。
- 存储 key：`trustedKnowledge.uiState.v1`。

API 缓存:

- API 封装缓存使用 `trustedKnowledge.apiCache.v1:`。
- 总览和列表页通常先读缓存，再在线刷新。

排序字段:

- 博客工厂：`copied_at`, `id`, `knowledge_id`, `factory_status`。
- 当前记录：`id`, `type`, `week`, `day`, `username`, `learn_level`。
- 历史查询：`history_date`, `id`, `type`, `username`, `learn_level`。
- 英语素材：`id`, `sequence_no`, `category`, `base_expression`, `title`, `flag`。

## 维护规则

以下情况需要更新本文档:

- `FUNCTION_NAV_ITEMS`、页面名称、页面顺序或页面标题变化。
- 任一页面的列布局、面板职责或移动端行为变化。
- 列表每页数量、总览卡片数量，或某个模块是否分页发生变化。
- 搜索、筛选、排序行为变化。
- 新增纯前端控件、复制模式、弹窗、抽屉或详情面板。
- 用户可见状态文案或状态流转变化。

如果后续前端继续扩大，建议把展示配置从 `App.tsx` 抽到一个小配置模块，例如 `frontend/src/uiConfig.ts`。这样手工改展示数量或默认行为会比直接编辑大型 `App.tsx` 更稳。
