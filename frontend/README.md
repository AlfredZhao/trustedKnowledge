# Trusted Knowledge Frontend

React + Vite workspace UI for trusted knowledge capture.

## Run

From the project root, prefer the managed scripts:

```bash
./scripts/start-frontend.sh
./scripts/stop-frontend.sh
./scripts/status.sh
```

Manual command using the dedicated conda environment:

```bash
conda run -n alfred npm install
conda run -n alfred npm run dev
```

The dev server is fixed to:

```text
http://localhost:8021
```

`strictPort` is enabled, so Vite will fail instead of moving to an unapproved port.

## API

The frontend calls same-origin `/api/...`. During development, Vite proxies `/api` to:

```text
http://localhost:8022
```

Configure it with:

```bash
VITE_API_BASE_URL=
```

Login uses `POST /api/auth/login`. The returned API key is stored in `sessionStorage` and sent as `X-API-Key` for knowledge API calls.

If the backend has WeChat login configured, the login page also shows a WeChat scan login button. A successful callback writes the returned API key to `sessionStorage` and keeps the existing API-key request flow.
