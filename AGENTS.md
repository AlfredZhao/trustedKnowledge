# trustedKnowledge Development Guide

## Project Structure

- `frontend/`: React + Vite frontend.
- `backend/`: FastAPI backend.
- `scripts/`: service start, stop, and status scripts.
- `logs/`: frontend and backend runtime logs.

## Common Commands

- Start all services: `scripts/start-all.sh`
- Check service status: `scripts/status.sh`
- Stop all services: `scripts/stop-all.sh`
- Start frontend only: `scripts/start-frontend.sh`
- Start backend only: `scripts/start-backend.sh`
- Verify frontend build: `cd frontend && npm run build`

## Development Rules

- Preserve the existing UI style, component structure, and Tailwind patterns.
- Keep edits scoped to the requested behavior; avoid unrelated refactors.
- Mobile views must keep core navigation and actions reachable.
- After frontend changes, run `cd frontend && npm run build` when feasible.
- For important feature changes or bug fixes, update `CHANGELOG.md` under `Unreleased` using `Added`, `Changed`, or `Fixed` entries.
- Do not change API fields, database structure, or authentication behavior unless explicitly requested.
- Do not delete user data, logs, or existing business code unless explicitly requested.
- If a service command fails because of sandbox or port permissions, report the exact command and error before changing process state.
- Do not start, stop, restart, or infer the real runtime status of frontend/backend services. When service restarts are needed, tell the user the exact command(s) to run and let the user operate them.

## Notes for Codex

- Read the relevant files before making code changes.
- Prefer `rg` for searching project code.
- Work with any existing user changes instead of reverting them.
- For UI fixes, check both desktop and mobile behavior.
