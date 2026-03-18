# Design: Add Keycloak Users to Workspace

**Date:** 2026-03-18
**Status:** Approved

---

## Problem

Users exist in Keycloak but have not yet logged in to ProjectHub, so no `WorkspaceMember` record exists for them. Workspace admins currently have no way to pre-add these users.

---

## Solution Overview

Integrate the Keycloak Admin API via `python-keycloak`. Expose two new backend endpoints. Add an "Adicionar membro" modal to `WorkspaceSettings` that lets admins search Keycloak users and add them with a chosen role.

---

## Backend

### Dependency

Add `python-keycloak` to `backend/requirements/base.txt`.

### Keycloak Admin Utility

**File:** `backend/apps/authentication/keycloak_admin.py`

A thin wrapper around `python-keycloak`'s `KeycloakAdmin`. Authenticated via `KEYCLOAK_ADMIN` + `KEYCLOAK_ADMIN_PASSWORD` env vars (already in `.env.example`). Exposes:

- `search_users(query: str) -> list[dict]` — calls Keycloak's `/admin/realms/{realm}/users?search={q}&max=20`, returns `[{ id (sub), email, firstName, lastName }]`.
- Instantiated once per request (no singleton — admin tokens are short-lived).

### New Endpoint 1: List Keycloak Users

```
GET /api/workspaces/keycloak-users/?search=<query>
```

- **Permission:** `IsWorkspaceMember` + `user.role == "admin"`
- Calls `KeycloakAdminClient.search_users(query)`
- Fetches current workspace member `keycloak_sub` set
- Filters out users already in the workspace
- Returns `[{ sub, email, name }]`

### New Endpoint 2: Add Member

```
POST /api/workspaces/members/
```

- **Permission:** `IsWorkspaceMember` + `user.role == "admin"`
- Body: `{ keycloak_sub, email, name, role }`
- Creates a `WorkspaceMember` linked to the current workspace
- On the user's first login, `KeycloakOIDCBackend` matches by `keycloak_sub` and uses the existing record
- Returns the serialized `WorkspaceMember`

### URL Routing

Both endpoints added to `backend/apps/workspaces/urls.py`.

---

## Frontend

### Service & Hook

- `workspaceService.keycloakUsers(search)` → `GET /workspaces/keycloak-users/?search=`
- `workspaceService.addMember({ keycloakSub, email, name, role })` → `POST /workspaces/members/`
- `useKeycloakUsers(search)` — TanStack Query, enabled when `search.length >= 2`
- `useAddWorkspaceMember()` — mutation, invalidates `['workspace-members']` on success

### UI: Add Member Modal

**File:** `frontend/src/features/workspace/AddMemberModal.tsx`

- Triggered by "Adicionar membro" button in `WorkspaceSettings.tsx`
- Search input (debounced 300 ms) calls `useKeycloakUsers`
- Results list: avatar initials + name + email
- Selecting a user shows a role dropdown (member / admin / guest) and an "Adicionar" button
- On confirm: calls `useAddWorkspaceMember`, closes modal
- Loading and empty states handled

### WorkspaceSettings Integration

- Import and render `<AddMemberModal>` with open/close state
- "Adicionar membro" button added to the members section header

---

## Error Handling

- Keycloak admin auth failure → 503 with user-facing message
- Duplicate member (already in workspace) → 400 `already_member`
- Invalid role → 400 from serializer validation

---

## Accessibility

- Modal uses `role="dialog"`, `aria-labelledby`, focus trap on open, Escape to close
- Search input has `aria-label`
- Results list items are keyboard-navigable

---

## Out of Scope

- Removing members (existing feature gap, separate task)
- Syncing roles from Keycloak groups
- Bulk add
