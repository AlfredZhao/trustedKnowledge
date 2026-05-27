# Trusted Knowledge Backend

Async FastAPI service for the Oracle-backed `AI_QA_LIB` trusted knowledge table.

## Setup

```bash
cd backend
conda run -n alfred pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with the real Oracle password:

```bash
TRUSTED_KNOWLEDGE_DB_USER=dev_alfred
TRUSTED_KNOWLEDGE_DB_PASSWORD=...
TRUSTED_KNOWLEDGE_DB_DSN=localhost:1521/orclpdb1
TRUSTED_KNOWLEDGE_ADMIN_USERNAME=admin
TRUSTED_KNOWLEDGE_ADMIN_PASSWORD=...
TRUSTED_KNOWLEDGE_API_KEY=...
```

All `/api/knowledge` routes require:

```text
X-API-Key: <TRUSTED_KNOWLEDGE_API_KEY>
```

## Run

From the project root, prefer the managed scripts:

```bash
./scripts/start-backend.sh
./scripts/stop-backend.sh
./scripts/status.sh
```

Manual command:

```bash
cd backend
conda run -n alfred uvicorn app.main:app --host 0.0.0.0 --port 8022
```

Open:

- `GET http://localhost:8022/health`
- `GET http://localhost:8022/api/knowledge`
- `POST http://localhost:8022/api/knowledge`

Example POST body:

```json
{
  "question": "Linux 如何查看当前时区？",
  "answer": "使用 timedatectl 命令查看当前系统时区。",
  "source": "manual",
  "topic_tag": "Linux,time",
  "blog_status": "未发布"
}
```
