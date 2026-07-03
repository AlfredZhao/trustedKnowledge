# Trusted Knowledge / 可信知识平台

## 中文说明

Trusted Knowledge 是一个基于 Oracle、FastAPI 和 React + Vite 的个人知识与工作流管理平台。当前项目已经覆盖可信知识沉淀、Blog 加工、待办事项、当前记录、历史记录、英语素材、AI 问数、AI 编程任务和 LLM 用量查看等工作区。

### 主要能力

- 可信知识管理：录入、查询、编辑、状态流转、批量合并，以及与待办事项互转。
- Blog 工厂：从可信知识生成 Blog 加工任务，保存加工结果、文章路径、校验值和发布状态。
- 待办事项：独立待办工作区，支持状态更新，并可转换为可信知识。
- 当前记录与历史记录：维护 `T_CURRENT`，查询 `T_HISTORY`，并保留数据库触发器驱动的历史沉淀流程。
- 英语素材：基于 `T_DOUYIN_DETAILS` 录入、浏览、编辑职场英语素材。
- AI 问数：对历史记录做受控自然语言分析，返回筛选条件、统计分布和代表性记录，不让 AI 执行任意 SQL。
- AI 编程：从网页提交受控 Codex 任务，可归档精简任务结论到可信知识库。
- 用量视图：查看 `v_llm_usage` 当前周期和历史采样数据。
- 移动端体验：支持 PWA 应用壳缓存、本地 GET 响应缓存和工作区状态恢复。

### 项目结构

```text
.
├── backend/          # FastAPI 后端，Oracle 数据访问、认证、业务 API
├── frontend/         # React + Vite + TypeScript 前端
├── scripts/          # 服务启动、停止、状态检查和发布辅助脚本
├── logs/             # 运行日志，脚本启动服务时写入
├── .run/             # 运行时 PID 文件，脚本启动服务时写入
├── CHANGELOG.md      # 中英双语变更日志
└── README.md         # 项目总览
```

### 技术栈

- 前端：React 19、TypeScript、Vite 6、Tailwind CSS、lucide-react。
- 后端：FastAPI、Uvicorn、Pydantic、python-oracledb。
- 数据库：Oracle，当前业务表和视图包括 `AI_QA_LIB`、`AI_TODO_ITEMS`、`AI_BLOG_FACTORY`、`T_CURRENT`、`T_HISTORY`、`T_DOUYIN_DETAILS`、`v_llm_usage` 等。
- 运行环境：默认使用 conda 环境 `alfred`。

### 初始化

后端依赖：

```bash
cd backend
conda run -n alfred pip install -r requirements.txt
cp .env.example .env
```

前端依赖：

```bash
cd frontend
conda run -n alfred npm install
```

编辑 `backend/.env`，至少配置 Oracle 连接和登录密钥：

```bash
TRUSTED_KNOWLEDGE_DB_USER=dev_alfred
TRUSTED_KNOWLEDGE_DB_PASSWORD=...
TRUSTED_KNOWLEDGE_DB_DSN=localhost:1521/orclpdb1
TRUSTED_KNOWLEDGE_DB_POOL_MIN=1
TRUSTED_KNOWLEDGE_DB_POOL_MAX=4
TRUSTED_KNOWLEDGE_DB_POOL_INCREMENT=1
TRUSTED_KNOWLEDGE_DB_POOL_PING_INTERVAL=60
TRUSTED_KNOWLEDGE_DB_POOL_TIMEOUT=300
TRUSTED_KNOWLEDGE_DB_POOL_MAX_LIFETIME_SESSION=3600
TRUSTED_KNOWLEDGE_CORS_ORIGINS=http://localhost:8021,http://127.0.0.1:8021
TRUSTED_KNOWLEDGE_ADMIN_USERNAME=admin
TRUSTED_KNOWLEDGE_ADMIN_PASSWORD=...
TRUSTED_KNOWLEDGE_API_KEY=...
TRUSTED_KNOWLEDGE_FRONTEND_BASE_URL=http://localhost:8021
TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY=...
```

不要提交 `backend/.env`。

AI 问数的 Base URL、模型名和启用状态在页面中配置并保存到 Oracle；LLM API Key 只从 `backend/.env` 的 `TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY` 读取，不保存到数据库。

### 服务运行

项目提供托管脚本，脚本会把 PID 写入 `.run/`，把日志写入 `logs/`：

```bash
./scripts/start-all.sh
./scripts/status.sh
./scripts/stop-all.sh
```

单独管理服务：

```bash
./scripts/start-backend.sh
./scripts/stop-backend.sh
./scripts/start-frontend.sh
./scripts/stop-frontend.sh
```

固定端口：

```text
Frontend: 8021
Backend:  8022
```

访问入口：

```text
Frontend:       http://localhost:8021
Backend health: http://localhost:8022/health
```

按项目约定，自动化代理不应擅自启动、停止或重启真实服务；需要重启时，由开发者手动执行上述脚本。

### 前端开发

前端开发服务器固定运行在 `8021`，并启用 `strictPort`。开发环境中，Vite 会把同源 `/api` 请求代理到 `http://127.0.0.1:8022`。

```bash
cd frontend
conda run -n alfred npm run dev
conda run -n alfred npm run build
conda run -n alfred npm run lint
```

如需显式指定 API 地址，可配置：

```bash
VITE_API_BASE_URL=
```

### 后端开发

手动启动后端：

```bash
cd backend
conda run -n alfred uvicorn app.main:app --host 0.0.0.0 --port 8022
```

健康检查：

```text
GET /health
```

主要 API 分组：

```text
/api/auth
/api/knowledge
/api/blog-factory
/api/todos
/api/current-records
/api/history
/api/history-ask
/api/english-materials
/api/usage
/api/codex
/api/system
```

### 认证

浏览器先调用：

```text
POST /api/auth/login
```

登录成功后，前端把返回的 API key 保存到 `sessionStorage`，后续请求通过请求头发送：

```text
X-API-Key: <api-key>
```

当前受保护的业务 API 会校验该请求头。

### 微信登录

用户名密码登录始终可用。若要启用微信开放平台网站登录，在 `backend/.env` 中配置：

```bash
TRUSTED_KNOWLEDGE_WECHAT_APP_ID=...
TRUSTED_KNOWLEDGE_WECHAT_APP_SECRET=...
TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI=https://your-api.example.com/api/auth/wechat/callback
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_OPENIDS=openid1,openid2
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_UNIONIDS=unionid1,unionid2
```

`TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI` 必须与微信开放平台配置的回调域名匹配。至少需要配置一个允许访问的 `openid` 或 `unionid`，否则微信用户授权后仍会被拒绝。

### 受控网页操作

默认情况下，网页端重启服务和网页端 Codex 执行都是关闭的。确需启用时，在 `backend/.env` 中显式设置：

```bash
TRUSTED_KNOWLEDGE_ALLOW_WEB_RESTART=true
TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true
TRUSTED_KNOWLEDGE_CODEX_BIN=codex
TRUSTED_KNOWLEDGE_WEB_CODEX_USER_CONCURRENCY=2
```

这些能力会触发本机命令执行，应只在可信环境中开启，并保留人工确认流程。

### 运行文件

```text
.run/backend.pid
.run/frontend.pid
logs/backend.log
logs/frontend.log
```

如果 `scripts/status.sh` 显示端口已监听但没有托管 PID 文件，通常表示服务曾被手动启动。停止脚本包含当前项目命令的受限兜底匹配，可用于清理匹配的前后端进程。

### 变更记录

重要功能变更和修复记录在 `CHANGELOG.md` 的 `本次版本更新` / `Unreleased` 区域。功能变更、缺陷修复或重要行为调整应同步更新变更日志。

## English

Trusted Knowledge is an Oracle-backed personal knowledge and workflow platform built with FastAPI and React + Vite. The current project covers trusted knowledge capture, Blog Factory tasks, todos, current records, history records, English learning materials, AI-assisted history analysis, controlled Codex coding tasks, and LLM usage monitoring.

### Capabilities

- Trusted knowledge: create, search, edit, update status, batch merge, and convert between knowledge items and todos.
- Blog Factory: generate Blog task packages from knowledge records and persist task status, article paths, checksums, and publishing state.
- Todos: manage todo items in a dedicated workspace and convert completed items back into trusted knowledge.
- Current and history records: maintain `T_CURRENT`, query `T_HISTORY`, and preserve the database-triggered history flow.
- English materials: create, browse, and edit workplace English materials backed by `T_DOUYIN_DETAILS`.
- AI Ask: run controlled natural-language analysis over history records and return filters, distributions, and evidence records without allowing arbitrary AI-generated SQL.
- AI Coding: submit controlled Codex tasks from the web UI and archive concise outcomes into the knowledge base.
- Usage dashboard: inspect current-cycle and sampled data from `v_llm_usage`.
- Mobile experience: PWA app shell caching, local GET response cache, and workspace state restoration.

### Project Structure

```text
.
├── backend/          # FastAPI backend, Oracle access, authentication, business APIs
├── frontend/         # React + Vite + TypeScript frontend
├── scripts/          # Service lifecycle and release helper scripts
├── logs/             # Runtime logs written by managed scripts
├── .run/             # Runtime PID files written by managed scripts
├── CHANGELOG.md      # Bilingual changelog
└── README.md         # Project overview
```

### Tech Stack

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS, lucide-react.
- Backend: FastAPI, Uvicorn, Pydantic, python-oracledb.
- Database: Oracle. Current business tables and views include `AI_QA_LIB`, `AI_TODO_ITEMS`, `AI_BLOG_FACTORY`, `T_CURRENT`, `T_HISTORY`, `T_DOUYIN_DETAILS`, and `v_llm_usage`.
- Runtime environment: conda environment `alfred` by default.

### Setup

Backend dependencies:

```bash
cd backend
conda run -n alfred pip install -r requirements.txt
cp .env.example .env
```

Frontend dependencies:

```bash
cd frontend
conda run -n alfred npm install
```

Edit `backend/.env` and configure at least the Oracle connection and authentication secrets:

```bash
TRUSTED_KNOWLEDGE_DB_USER=dev_alfred
TRUSTED_KNOWLEDGE_DB_PASSWORD=...
TRUSTED_KNOWLEDGE_DB_DSN=localhost:1521/orclpdb1
TRUSTED_KNOWLEDGE_DB_POOL_MIN=1
TRUSTED_KNOWLEDGE_DB_POOL_MAX=4
TRUSTED_KNOWLEDGE_DB_POOL_INCREMENT=1
TRUSTED_KNOWLEDGE_DB_POOL_PING_INTERVAL=60
TRUSTED_KNOWLEDGE_DB_POOL_TIMEOUT=300
TRUSTED_KNOWLEDGE_DB_POOL_MAX_LIFETIME_SESSION=3600
TRUSTED_KNOWLEDGE_CORS_ORIGINS=http://localhost:8021,http://127.0.0.1:8021
TRUSTED_KNOWLEDGE_ADMIN_USERNAME=admin
TRUSTED_KNOWLEDGE_ADMIN_PASSWORD=...
TRUSTED_KNOWLEDGE_API_KEY=...
TRUSTED_KNOWLEDGE_FRONTEND_BASE_URL=http://localhost:8021
TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY=...
TRUSTED_KNOWLEDGE_SKILL_MAX_ZIP_MB=20
```

Do not commit `backend/.env`.

AI Ask stores Base URL, model name, and enablement in Oracle from the UI. The LLM API key is read only from `TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY` in `backend/.env` and is not stored in the database.

### Running Services

Use the managed scripts. They write PID files to `.run/` and logs to `logs/`:

```bash
./scripts/start-all.sh
./scripts/status.sh
./scripts/stop-all.sh
```

Manage services individually:

```bash
./scripts/start-backend.sh
./scripts/stop-backend.sh
./scripts/start-frontend.sh
./scripts/stop-frontend.sh
```

Fixed ports:

```text
Frontend: 8021
Backend:  8022
```

Open:

```text
Frontend:       http://localhost:8021
Backend health: http://localhost:8022/health
```

By project convention, automation agents should not start, stop, restart, or infer the real runtime status of frontend/backend services. When a restart is needed, a developer should run the scripts manually.

### Frontend Development

The frontend dev server is fixed to port `8021` with `strictPort` enabled. During development, Vite proxies same-origin `/api` requests to `http://127.0.0.1:8022`.

```bash
cd frontend
conda run -n alfred npm run dev
conda run -n alfred npm run build
conda run -n alfred npm run lint
```

To override the API base URL, configure:

```bash
VITE_API_BASE_URL=
```

### Backend Development

Manual backend command:

```bash
cd backend
conda run -n alfred uvicorn app.main:app --host 0.0.0.0 --port 8022
```

Health check:

```text
GET /health
```

Main API groups:

```text
/api/auth
/api/knowledge
/api/blog-factory
/api/todos
/api/current-records
/api/history
/api/history-ask
/api/english-materials
/api/usage
/api/codex
/api/system
```

### Authentication

The browser first logs in through:

```text
POST /api/auth/login
```

After login, the frontend stores the returned API key in `sessionStorage` and sends it on subsequent requests as:

```text
X-API-Key: <api-key>
```

Protected business APIs validate this header.

### WeChat Login

Username/password login remains available. To enable WeChat Open Platform website login, set the following values in `backend/.env`:

```bash
TRUSTED_KNOWLEDGE_WECHAT_APP_ID=...
TRUSTED_KNOWLEDGE_WECHAT_APP_SECRET=...
TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI=https://your-api.example.com/api/auth/wechat/callback
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_OPENIDS=openid1,openid2
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_UNIONIDS=unionid1,unionid2
```

`TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI` must match the callback domain configured for the WeChat Open Platform app. At least one allowed `openid` or `unionid` is required; otherwise authorized WeChat users will still be denied.

### Controlled Web Actions

Web-triggered service restart and web-triggered Codex execution are disabled by default. Enable them explicitly only when needed:

```bash
TRUSTED_KNOWLEDGE_ALLOW_WEB_RESTART=true
TRUSTED_KNOWLEDGE_ALLOW_WEB_CODEX=true
TRUSTED_KNOWLEDGE_CODEX_BIN=codex
TRUSTED_KNOWLEDGE_WEB_CODEX_USER_CONCURRENCY=2
```

These features execute local commands. Enable them only in a trusted environment and keep the manual confirmation flow.

### Runtime Files

```text
.run/backend.pid
.run/frontend.pid
logs/backend.log
logs/frontend.log
```

If `scripts/status.sh` reports a listening port but no managed PID file, the service was probably started manually. The stop scripts include a scoped fallback for current project commands and can clean up matching frontend/backend processes.

### Changelog

Important feature changes and fixes are tracked in `CHANGELOG.md` under `本次版本更新` / `Unreleased`. Update the changelog for feature work, bug fixes, or important behavior changes.
