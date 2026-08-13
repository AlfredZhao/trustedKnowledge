# Trusted Knowledge / 可信知识平台

基于 Oracle、FastAPI 和 React + Vite 的个人与小团队知识工作台。它把知识沉淀、AI 加工、内容发布、任务管理和工程协作串成可追溯的工作流。

## 核心流程

```text
信息录入 → 知识加工 → 博客工厂 → 发布
待办事项 → 当前记录 → 历史查询 → AI 问数
AI 编程 → 可信知识归档
```

## 功能概览

- **知识与内容**：录入可信知识、Markdown 图片、知识/待办互转、AI 加工、博客稿件编辑与 MetaWeblog 发布。
- **记录与检索**：待办、当前记录、历史记录、英语素材，以及按业务域进行的受控 AI 问数。
- **AI 能力**：Skill 管理、知识加工、AI 编程任务与结果归档、LLM 用量监控。
- **协作与治理**：用户及可见范围管理、个人机密加密存储、AI 图谱和工作台总览。
- **使用体验**：桌面与移动端适配，生产构建支持 PWA 应用壳缓存。

## 技术栈

- 前端：React、TypeScript、Vite、Tailwind CSS
- 后端：FastAPI、Pydantic、python-oracledb
- 数据库：Oracle

## 目录

```text
frontend/    React 前端
backend/     FastAPI 服务与 Oracle 数据访问
scripts/     服务管理与发布辅助脚本
docs/        产品与回归说明
```

## 快速开始

1. 准备 Oracle 数据库，并创建后端配置：

   ```bash
   cd backend
   cp .env.example .env
   ```

   在 `.env` 中至少填写数据库连接、管理员密码和 API Key；如需使用个人机密功能，还应配置稳定的 `TRUSTED_KNOWLEDGE_PERSONAL_SECRET_KEY`。

2. 安装依赖：

   ```bash
   conda run -n alfred pip install -r backend/requirements.txt
   conda run -n alfred npm --prefix frontend install
   ```

3. 由开发者启动服务：

   ```bash
   ./scripts/start-all.sh
   ```

   默认访问地址为 `http://localhost:8021`，健康检查为 `http://localhost:8022/health`。

常用命令：

```bash
./scripts/status.sh
./scripts/stop-all.sh
cd frontend && npm run build
```

## 相关文档

- [前端功能说明](docs/frontend-overview.md)
- [变更日志](CHANGELOG.md)
- [回归注意事项](docs/regression-notes.md)

> 请勿提交 `backend/.env`。网页端 Codex、服务重启和第三方登录等可选能力默认受配置开关控制；仅应在可信环境中启用。
