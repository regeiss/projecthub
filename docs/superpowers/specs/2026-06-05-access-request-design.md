# Access Request Flow — Design Spec

**Date:** 2026-06-05
**Status:** Approved

---

## Overview

When a user authenticates via Keycloak (any identity provider) and has no workspace membership, instead of showing the create-workspace wizard they see a "Request Access" form. Admins receive an in-app notification and can approve or deny the request from a dedicated workspace settings tab. On approval the user's `WorkspaceMember` record is created automatically; on denial they can re-request with a notice showing the admin's reason.

---

## Data Model

New model `AccessRequest` in `apps/authentication/` (or a new `apps/access_requests/` app).

```
AccessRequest
  id                UUID        PK
  keycloak_sub      str         indexed (not FK — no WorkspaceMember exists yet)
  email             str
  name              str
  workspace         FK          → Workspace (workspace being requested)
  secretaria        str         max_length=120, free-text
  reason            text        optional
  status            enum        pending | approved | denied
  denial_reason     text        optional, set by admin on denial
  requested_at      datetime    auto_now_add
  resolved_at       datetime    null until resolved
  resolved_by       FK          → WorkspaceMember, null until resolved
  previous_request  FK → self   null; points to prior denied request on re-request
```

**Key invariants:**
- A `sub` may have at most one `pending` request per workspace at a time. Submitting again when one is pending returns the existing request.
- Re-requests create a new row with `previous_request` pointing to the denied one — old rows are never mutated.
- On approval the backend creates `WorkspaceMember` rows (one per granted workspace) in a single transaction with the status update.

---

## Backend API

All endpoints under `/api/v1/`.

### Unauthenticated / bootstrap (no `X-Workspace-ID` header required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/access-requests/` | JWT only | Submit a new request. Body: `{workspace_id, secretaria, reason?}`. Reads `keycloak_sub`, `email`, `name` from the decoded JWT. Returns 201 `{id, status, requested_at}`. |
| `GET`  | `/auth/access-requests/me/` | JWT only | Poll for status. Returns latest request for this `sub`: `{id, status, denial_reason, requested_at, workspace_name}`. 404 if no request exists. |

The endpoint calls `_decode_jwt()` directly, bypassing the DRF authenticator, so it works before any `WorkspaceMember` exists.

### Admin endpoints (requires workspace admin role)

| Method | Path | Description |
|--------|------|-------------|
| `GET`    | `/workspaces/{id}/access-requests/` | List requests for this workspace. Query params: `status=pending\|approved\|denied\|all` (default `pending`). Returns paginated list with requester details and `previous_request` summary. |
| `PATCH`  | `/workspaces/{id}/access-requests/{req_id}/` | Approve or deny. Body: `{action: "approve"\|"deny", extra_workspace_ids?: UUID[], denial_reason?: str}`. On approve: creates `WorkspaceMember` rows for requested workspace + any extras, sets status, sends emails via Celery. On deny: sets `denial_reason`, sends email via Celery. |

**Permissions:** `IsWorkspaceMember` + `user.role == "admin"` (or workspace-level `IsProjectAdmin`). Non-admins receive 403.

### Auth middleware — no changes needed

`_get_or_create_member` already returns an unsaved `WorkspaceMember` stub when no membership exists (the bootstrap path). The new endpoints bypass the authenticator entirely, so the existing middleware logic is untouched.

---

## Frontend Flow

### Route change

**Current:** authenticated + no workspaces → `/onboarding`
**New:** authenticated + no workspaces → GET `/auth/access-requests/me/`
  - 404 → navigate to `/request-access` (form state)
  - `status: pending` → navigate to `/request-access` (pending state)
  - `status: denied` → navigate to `/request-access` (form state with denial banner)
  - `status: approved` → user now has workspaces; normal flow resumes

This check lives in `AuthProvider.tsx`, replacing the existing redirect to `/onboarding`.

### New route: `/request-access`

Single page `frontend/src/features/auth/RequestAccessPage.tsx` with three internal states:

**1. Form state**
- Name field: pre-filled from auth store, read-only
- Email field: pre-filled from auth store, read-only
- Workspace field: autocomplete — fetches `/workspaces/` for name suggestions, free-text accepted (no hard constraint)
- Secretaria / Área field: free-text, max 120 chars
- Reason field: textarea, optional
- Submit → POST `/auth/access-requests/` → transition to pending state

**2. Pending state**
- Shows: submitted workspace name, submitted timestamp, user email ("we'll notify you at…")
- Polls `/auth/access-requests/me/` every 30 s
- On `approved`: calls `refetchWorkspaces()` → `AuthProvider` re-evaluates → user lands on normal workspace view
- On `denied`: transitions to form state with denial banner

**3. Denial banner (form state re-entry)**
- Shows admin's `denial_reason` if provided, otherwise: "Sua solicitação foi negada. Entre em contato com o administrador ou tente novamente."
- Pre-fills `secretaria` and `reason` from the previous denied request
- User can edit and re-submit

### Admin UI — workspace settings

New tab **"Solicitações"** in the existing workspace settings page (`/settings/workspace?tab=requests`).

- Two-column list: left = requester info (name, email, secretaria, reason, requested date, prior denial count); right = action controls
- Action controls per request:
  - Workspace selector: pre-filled with requested workspace, admin can add more (multi-select from workspace list)
  - Role selector: defaults to `member`
  - **Aprovar** button: fires PATCH with `action: "approve"` + selected workspaces
  - **Negar** button: expands inline denial-reason text field + confirm button; fires PATCH with `action: "deny"`
- Tab shows unread badge count matching the notification store

### Sidebar notification badge

New notification type `access_request` fed into the existing `notificationStore`. Deep-link navigates to `/settings/workspace?tab=requests`. Uses the existing notification infrastructure — no new store or channel needed.

---

## Email Notifications

Sent via Celery task on the `notifications` queue.

| Trigger | Recipient | Subject | Body |
|---------|-----------|---------|------|
| New request submitted | All workspace admins | `Nova solicitação de acesso — {name}` | Requester name, email, secretaria, workspace, reason (if provided), link to `/settings/workspace?tab=requests` |
| Request approved | Requester | `Acesso aprovado — {workspace name}` | List of all workspaces granted, login link |
| Request denied | Requester | `Solicitação de acesso negada` | Admin's `denial_reason` or generic fallback; instructions to re-request |

---

## Testing

### Backend (Django unittest)

**Model tests (`AccessRequestModelTests`):**
- Create request; assert `status=pending`, `resolved_at=None`
- Re-request after denial creates new row with `previous_request` set; original row unchanged
- Duplicate pending request for same sub+workspace returns existing row (no duplicate created)
- Approve: `WorkspaceMember` rows created for requested + extra workspaces in same transaction; `status=approved`, `resolved_at` set

**API tests (`AccessRequestAPITests`):**
- `POST /auth/access-requests/` with valid JWT, no membership → 201
- `POST` duplicate pending → returns existing (idempotent, 200)
- `GET /auth/access-requests/me/` → correct status returned
- `GET /auth/access-requests/me/` with no request → 404
- `PATCH approve` by admin → 200, `WorkspaceMember` created, email task queued
- `PATCH deny` by admin → 200, `denial_reason` saved, email task queued
- `PATCH` by non-admin → 403
- `PATCH` with `extra_workspace_ids` → additional `WorkspaceMember` rows created

**Auth middleware regression (`AuthMiddlewareTests`):**
- Bootstrap path (no `X-Workspace-ID`) still works for existing members
- Workspace-scoped path still rejects non-members with 401

### Frontend (Vitest + React Testing Library)

**`RequestAccessPage.test.tsx`:**
- Renders form when `/auth/access-requests/me/` returns 404
- Shows pending state after successful POST
- Transitions to denial banner when poll returns `status: denied`
- Renders `denial_reason` in banner when provided
- Calls `refetchWorkspaces` when poll returns `status: approved`

**`WorkspaceAutocomplete.test.tsx`:**
- Displays workspace name suggestions from `/workspaces/`
- Accepts free-text value not in suggestion list

**`AccessRequestsTab.test.tsx` (admin settings):**
- Renders pending requests list
- Approve button sends correct PATCH payload
- Deny button requires non-empty reason before enabling confirm
- Extra workspace selector adds `extra_workspace_ids` to payload

---

## Out of Scope

- Automatic expiry of pending requests (can be added as a Celery beat task later)
- Bulk approve/deny (single request at a time is sufficient for now)
- User-visible request history beyond the most recent request
