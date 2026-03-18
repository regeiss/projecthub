# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Frontend (React + Vite)

```bash
cd frontend
npm run dev          # Dev server on port 5173
npm run build        # Production build
npm run typecheck    # tsc --noEmit (run before committing)
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch mode
```

### Backend (Django)

```bash
cd backend

# With docker compose (recommended — brings up DB + Redis)
docker compose up api

# Or with a venv, after setting env vars:
python manage.py runserver        # Dev server
python manage.py migrate
python manage.py shell_plus       # Enhanced shell (django-extensions)

# Celery workers (must run separately from API)
celery -A config worker --queues=default,cpm,notifications,sync
celery -A config beat --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Full stack via Docker Compose

```bash
docker compose up                          # Starts all services
docker compose --profile monitoring up    # Also starts Flower (Celery UI on :5555)
docker compose --profile keycloak up      # Also starts bundled Keycloak on :8080
```

### Run a single backend test

```bash
cd backend
python manage.py test apps.<app_name>.tests.<TestClass>.<test_method>
```

---

## Architecture overview

The stack is: **React SPA → Nginx → Django (Daphne/ASGI) + Celery + PostgreSQL + Redis**. Authentication flows entirely through Keycloak OIDC — Django never issues its own JWTs, it only validates tokens from Keycloak via JWKS.

### Frontend data flow

```
features/ (pages + business logic)
  └── hooks/       ← TanStack Query per domain (useIssues, useProjects…)
       └── services/   ← plain objects calling lib/axios.ts
            └── lib/axios.ts   ← singleton, injects Bearer token + X-Workspace-ID header
```

- **`components/`** is UI-only — no API calls allowed here.
- **Zustand stores** (`authStore`, `workspaceStore`, `notificationStore`) are for UI state only. Server data lives in TanStack Query cache.
- **`lib/axios.ts`** sends `X-Workspace-ID` on every request; the backend uses this header to scope all queries to the correct workspace.
- TipTap content is stored and transmitted as **TipTap JSON** (`Record<string, unknown>`), not HTML. Use `tiptapToHtml()` from `lib/editor.ts` to render it.

### Backend request lifecycle

1. Nginx routes `/api/` → Daphne (Django ASGI), `/ws/` → Django Channels consumers.
2. `backends.py` validates the Keycloak JWT locally (no round-trip to Keycloak).
3. The JWT `sub` is used to look up or create a `WorkspaceMember`.
4. `request.user` is always a `WorkspaceMember` (not Django's `User`). Workspace is resolved from the `X-Workspace-ID` header.

### Permissions

Custom permissions in `core/permissions.py`. Never use DRF's `IsAdminUser`.
- `IsWorkspaceMember` — any authenticated member of the workspace
- `IsProjectAdmin` — project-level admin role
- Workspace-level admin (`user.role == "admin"`) bypasses project-level checks

### CPM (Critical Path Method)

Issues have `estimate_days` and `IssueRelation` dependencies. When saved, a Django signal fires a Celery task → `apps/cpm/algorithm.py` uses NetworkX to compute ES/EF/LS/LF/slack → results are stored in `cpm_issue_data` → broadcast via WebSocket channel group `project_{project_id}` → frontend Gantt/network diagram updates in real time.

### Wiki collaboration

The wiki uses **Yjs CRDT** for real-time co-editing. The backend (`WikiPageConsumer`) is a pure relay — it broadcasts Yjs binary messages to all clients in the channel group `page_{page_id}`. No merge logic lives on the server. Content is auto-saved to the DB via a 2-second debounce in `WikiEditor.tsx`.

### Kanban sort order

Issue positions use a float `sort_order`. When dragging, the new value is the midpoint between neighbours. When the gap between neighbours is < 0.001, the entire column is reindexed. Optimistic updates are applied immediately and rolled back on error.

---

## Key conventions

### Backend
- All PKs are UUIDs.
- `request.user` is `WorkspaceMember`, not Django's `User`. Never reference `request.user.id` expecting a Django User PK.
- Never use raw SQL — always use the ORM or parameterised queries.
- Never log full JWT tokens.
- Wiki content is sanitised with `bleach` before saving.

### Frontend
- Use `@/` path alias for `frontend/src/`.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Use `import.meta.env.VITE_*` for env vars — never `process.env`.
- Never import `axios` directly in features; always use `lib/axios.ts`.
- API responses use `snake_case`; TypeScript types use `camelCase`. Mapping happens in `services/`.

### Routing
All project-level pages live under `/projects/:projectId/<tab>` and are wrapped in `ProjectProvider`, which sets `currentProject` in `workspaceStore`. Add new project tabs to both `ProjectNav.tsx` (navigation) and `App.tsx` (route).

---

## Environment variables

See `docs/ARCHITECTURE.md` for the full list. The most critical:

| Variable | Used by |
|---|---|
| `VITE_API_URL` | Frontend → API base URL |
| `VITE_WS_URL` | Frontend → WebSocket base URL |
| `VITE_KEYCLOAK_*` | Frontend → Keycloak client config |
| `DATABASE_URL` | Django ORM |
| `REDIS_URL` / `CELERY_BROKER_URL` | Cache, channels, Celery |
| `KEYCLOAK_SERVER_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT_SECRET` | JWT verification |
