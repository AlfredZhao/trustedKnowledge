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
- For important feature changes, bug fixes, or project-rule updates, update `CHANGELOG.md` in the current in-progress section under `## 本次版本更新`, using `Added`, `Changed`, or `Fixed` entries. Do not add entries to already released version sections.
- For bug fixes with meaningful regression risk, add or update an entry in `docs/regression-notes.md` with the symptom, trigger, root cause, safe pattern, and guardrail test.
- For frontend layout, navigation, display count, pagination, or pure presentation behavior changes, update `docs/frontend-overview.md` in the same change.
- For UI changes involving navigation, filters, pagination, theme, loading states, dialogs, or reusable controls, check the same interaction pattern across related modules instead of fixing only the currently reported screen.
- For UI fixes that can affect presentation states, verify desktop/mobile behavior and dark/light theme behavior when those modes exist, including dialog, loading, and empty-state readability.
- Before completing any UI-affecting requirement, check the affected page at both desktop-web and mobile widths for clipped, overflowing, or unreachable controls; also check the relevant theme and state variants when they exist.
- For user-scoped modules, default filters and `清空筛选条件` behavior should return to the current user's default visible scope unless the requirement explicitly says otherwise. Do not silently change a module to a global cross-user default.
- Do not change API fields, database structure, or authentication behavior unless explicitly requested.
- For every Oracle SQL execution, pass only bind names that occur in that statement's SQL text. In update workflows, keep row-lock/read, update, count, and vector-query parameter dictionaries separate; never reuse business-field binds for a preceding `SELECT ... FOR UPDATE` query. Add a regression test when changing dynamic SQL bindings.
- Do not delete user data, logs, or existing business code unless explicitly requested.
- If a service command fails because of sandbox or port permissions, report the exact command and error before changing process state.
- Do not start, stop, restart, or infer the real runtime status of frontend/backend services. When service restarts are needed, tell the user the exact command(s) to run and let the user operate them.
- If a change requires service restart, config reload, cache clear, schema migration, or other manual post-change action, state that explicitly in the final response with the exact command(s) and the reason they are needed.

## Notes for Codex

- Read the relevant files before making code changes.
- Prefer `rg` for searching project code.
- Work with any existing user changes instead of reverting them.
- For UI fixes, check both desktop and mobile behavior; if themes or dialogs are involved, also check the affected visual states consistently.
