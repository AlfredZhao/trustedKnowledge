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
TRUSTED_KNOWLEDGE_DB_POOL_PING_INTERVAL=60
TRUSTED_KNOWLEDGE_DB_POOL_TIMEOUT=300
TRUSTED_KNOWLEDGE_DB_POOL_MAX_LIFETIME_SESSION=3600
TRUSTED_KNOWLEDGE_META_WEBLOG_TIMEOUT_SECONDS=60
TRUSTED_KNOWLEDGE_ADMIN_USERNAME=admin
TRUSTED_KNOWLEDGE_ADMIN_PASSWORD=...
TRUSTED_KNOWLEDGE_API_KEY=...
TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY=...
TRUSTED_KNOWLEDGE_PERSONAL_SECRET_KEY=change-this-to-a-long-random-secret-value
TRUSTED_KNOWLEDGE_SKILL_MAX_ZIP_MB=20
TRUSTED_KNOWLEDGE_MEDIA_STORAGE_DIR=data/media
TRUSTED_KNOWLEDGE_MEDIA_MAX_IMAGE_MB=8
```

The pool ping/lifetime settings keep idle Oracle sessions from being reused too long after mobile PWA resumes or network interruptions.

AI Ask keeps Base URL, model name, and enablement in Oracle, but reads the LLM API key only from `TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY`.
Personal Secrets encrypts username/password/notes fields with an AES-GCM key derived from `TRUSTED_KNOWLEDGE_PERSONAL_SECRET_KEY`; set it to a stable random value of at least 32 characters before using that module.

Protected API routes require:

```text
X-API-Key: <TRUSTED_KNOWLEDGE_API_KEY or login session token>
```

The environment `admin` user keeps using `TRUSTED_KNOWLEDGE_API_KEY` and is treated as the super administrator.
Ordinary users are stored in the independent `TK_USERS` table and receive a session token from `POST /api/auth/login`.
The backend initializes `TK_USERS`, `TK_USER_SESSIONS`, and `TK_RELATIONS` on startup, then backfills compatible `USER_ID` columns on `T_CURRENT`, `T_HISTORY`, and `T_RELATIONS` while preserving the old `USERNAME` columns for display compatibility.
It also adds compatible `USER_ID` ownership columns on `AI_QA_LIB`, `AI_TODO_ITEMS`, `AI_BLOG_FACTORY`, and `T_DOUYIN_DETAILS`.
Rows with no `USER_ID` remain admin-visible legacy rows; ordinary users only see rows owned by themselves or visible child users.

Markdown image uploads use `POST /api/media` with multipart form data. The backend stores image files under `TRUSTED_KNOWLEDGE_MEDIA_STORAGE_DIR`, writes metadata to `TK_MEDIA_ASSETS`, and returns Markdown using an opaque `/api/media/{public_id}/content` URL. Uploads are authenticated and user-owned; image rendering uses the opaque public ID so browser `<img>` tags can load without custom request headers.

Admin-only user management routes live under `/api/users`:

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{user_id}`
- `POST /api/users/{user_id}/reset-password`
- `GET /api/users/relations`
- `POST /api/users/relations`
- `PATCH /api/users/relations/{relation_id}`

## WeChat Login

Username/password login remains enabled. To also enable WeChat Open Platform website login, set:

```bash
TRUSTED_KNOWLEDGE_FRONTEND_BASE_URL=https://your-frontend.example.com
TRUSTED_KNOWLEDGE_WECHAT_APP_ID=...
TRUSTED_KNOWLEDGE_WECHAT_APP_SECRET=...
TRUSTED_KNOWLEDGE_WECHAT_REDIRECT_URI=https://your-api.example.com/api/auth/wechat/callback
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_OPENIDS=openid1,openid2
TRUSTED_KNOWLEDGE_WECHAT_ALLOWED_UNIONIDS=unionid1,unionid2
```

The redirect URI must match the callback domain configured for the WeChat website app.
At least one allowed `openid` or `unionid` is required; otherwise WeChat users are denied after authorization.
For initial setup, scan once and check the backend log for the denied `openid` or `unionid`, then add it to the allowlist.

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
