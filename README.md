# Trusted Knowledge

Oracle-backed trusted knowledge capture platform with FastAPI and React.

## Managed Operations

Use the dedicated conda environment `alfred`. The scripts keep PID files in `.run/` and logs in `logs/`.

```bash
./scripts/start-all.sh
./scripts/status.sh
./scripts/stop-all.sh
```

Individual services:

```bash
./scripts/start-backend.sh
./scripts/stop-backend.sh
./scripts/start-frontend.sh
./scripts/stop-frontend.sh
```

Ports are fixed:

```text
Frontend: 8021
Backend:  8022
```

Open:

```text
http://localhost:8021
```

Backend health:

```text
http://localhost:8022/health
```

## Authentication

The browser first logs in through:

```text
POST /api/auth/login
```

After login, the frontend stores the returned API key in `sessionStorage` and sends it as:

```text
X-API-Key: <api-key>
```

All knowledge APIs under `/api/knowledge` require this header.

Authentication settings live in `backend/.env`:

```bash
TRUSTED_KNOWLEDGE_ADMIN_USERNAME=admin
TRUSTED_KNOWLEDGE_ADMIN_PASSWORD=...
TRUSTED_KNOWLEDGE_API_KEY=...
```

Do not commit `backend/.env`.

If `status.sh` says a port is listening but no managed PID file was found, that service was probably started manually before the scripts were introduced. The stop scripts include a scoped fallback for the current project commands, so `./scripts/stop-all.sh` can still stop those matching frontend/backend processes.

Runtime files:

```text
.run/backend.pid
.run/frontend.pid
logs/backend.log
logs/frontend.log
```
