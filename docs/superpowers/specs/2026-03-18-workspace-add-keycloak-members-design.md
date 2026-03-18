# Design: Add Keycloak Users to Workspace

**Date:** 2026-03-18
**Status:** Approved

---

## Problem

Users exist in Keycloak but have not yet logged in to ProjectHub, so no `WorkspaceMember` record exists for them. Workspace admins currently have no way to pre-add these users.

---

## Solution Overview

Integrate the Keycloak Admin API via `python-keycloak`. Expose two new backend endpoints scoped under the workspace slug. Add an "Adicionar membro" modal to `WorkspaceSettings` that lets admins search Keycloak users and add them with a chosen role.

---

## Backend

### Dependency

Add to `backend/requirements/base.txt`:
```
python-keycloak==7.1.1
```

### Keycloak Admin Utility

**File:** `backend/apps/authentication/keycloak_admin.py`

A thin wrapper around `python-keycloak`'s `KeycloakAdmin`. Authenticated via:
- `KEYCLOAK_SERVER_URL` + `KEYCLOAK_REALM` (already used for JWT validation)
- `KEYCLOAK_ADMIN` + `KEYCLOAK_ADMIN_PASSWORD`

**Scope of these env vars:** In `.env.example` they are annotated as local-only (`apenas profile:keycloak`). For production deployments using an external Keycloak, a dedicated service account with the `view-users` realm role is required. The env vars must be added to the production environment configuration (outside `.env.example`). The `docs/ARCHITECTURE.md` env-vars table should be updated accordingly.

**Token caching:** `KeycloakAdmin` is instantiated per-request. This incurs one admin token exchange per search call. At the expected low volume of an internal admin tool, this is acceptable. If higher traffic is anticipated, a per-process singleton with token refresh should be introduced.

Exposes:
- `search_users(query: str) -> list[dict]` — calls `/admin/realms/{realm}/users?search={q}&max=20`, maps result to `[{ sub, email, name }]` (from `id`, `email`, `firstName + " " + lastName`). If both `firstName` and `lastName` are empty, falls back to `username` — consistent with how `_get_or_create_member` falls back to `preferred_username`.

Raises `KeycloakAdminUnavailable` (custom exception) on auth failure or unreachable Keycloak → translated to HTTP 503 in the view.

### New Endpoint 1: Search Keycloak Users

```
GET /api/workspaces/{slug}/keycloak-users/?search=<query>
```

**View class:** `WorkspaceKeycloakUsersView(APIView)` in `backend/apps/workspaces/views.py`

- `permission_classes = [IsWorkspaceAdmin]`
- Resolves workspace via `_get_workspace(self.kwargs["slug"])` (existing helper)
- Requires `search` query param with at least 2 characters — returns 400 if shorter or absent (prevents Keycloak returning all users on empty query)
- Calls `KeycloakAdminClient.search_users(request.query_params.get("search", ""))`
- Fetches current workspace member `keycloak_sub` set
- Filters out users already present
- Returns `[{ sub, email, name }]`
- On `KeycloakAdminUnavailable`: returns 503 `{ detail: "keycloak_unavailable" }`

### New Endpoint 2: Add Member

```
POST /api/workspaces/{slug}/members/create/
```

**View class:** `WorkspaceMemberCreateView(generics.CreateAPIView)` in `backend/apps/workspaces/views.py`

This is a **separate view** from `WorkspaceMemberListView` (which remains `ListAPIView` with `IsAuthenticated` unchanged) to avoid permission conflicts.

- `permission_classes = [IsWorkspaceAdmin]`
- `serializer_class = WorkspaceMemberCreateSerializer`
- Resolves workspace in `perform_create` via `_get_workspace(self.kwargs["slug"])`
- Catches `IntegrityError` and returns 400 `{ detail: "already_member" }` (race-condition guard)
- Returns the serialized `WorkspaceMember` on success

**Role preservation on first login:** `KeycloakJWTAuthentication._get_or_create_member` calls `get_or_create(keycloak_sub=..., workspace=..., defaults={...})`. When the member already exists, it only syncs `email` and `name` via `update_fields` — `role` is never in `update_fields`. The pre-set role is therefore preserved. This invariant must not be broken by future changes to `_get_or_create_member`.

### WorkspaceMemberCreateSerializer

New serializer in `backend/apps/workspaces/serializers.py`:

- Writable fields: `keycloak_sub`, `email`, `name`, `role`
- `validate_role`: must be one of `("admin", "member", "guest")` — matching `WorkspaceMember.Role.choices`. Note: `guest` has restricted app access (`IsWorkspaceMember` allows only `admin` and `member`); pre-adding a guest is intentional for limited-access users. (`viewer` in `_ROLE_RANK` is a project-level concept; `guest` here is the workspace-level role from `WorkspaceMember.Role`.)
- The duplicate-member check is done in the **view** (not the serializer `validate`) to produce a clean `Response({"detail": "already_member"}, status=400)` string — avoids DRF's `ValidationError` wrapping the message in a list under `non_field_errors`. The DB `unique_together` constraint on `(workspace, keycloak_sub)` (already present in `WorkspaceMember.Meta` — no new migration required) is the authoritative guard; the view catches `IntegrityError` for races.

### URL Routing

Added to `backend/apps/workspaces/urls.py` under the existing `<slug:slug>/` prefix:

```python
path("<slug:slug>/keycloak-users/", WorkspaceKeycloakUsersView.as_view()),
path("<slug:slug>/members/create/", WorkspaceMemberCreateView.as_view()),
```

*(Using `/members/create/` rather than `POST /members/` to avoid conflicts with the existing `ListAPIView` at `/members/`.)*

### Environment Variables

`KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD` must be added to the env-vars table in `docs/ARCHITECTURE.md` and to the production environment. They are not in `.env.example` for non-local environments.

### Docker Image Rebuild

After adding `python-keycloak==7.1.1` to `requirements/base.txt`, the backend Docker image must be rebuilt: `docker compose build api` before bringing the service up.

---

## Frontend

### TypeScript Type

Add to the workspace types file:

```ts
export interface KeycloakUser {
  sub: string
  email: string
  name: string
}
```

Pre-added members have no `avatar_url` — it remains `null` until the user first logs in and `_get_or_create_member` populates it from the JWT claims.

### Service Methods

In `frontend/src/services/workspace.service.ts`:

- `keycloakUsers(slug: string, search: string)` → `GET /workspaces/{slug}/keycloak-users/?search={search}` → returns `KeycloakUser[]`
- `addMember(slug: string, data: { keycloakSub: string; email: string; name: string; role: string })` → `POST /workspaces/{slug}/members/create/` with body `{ keycloak_sub: data.keycloakSub, email: data.email, name: data.name, role: data.role }` (camelCase → snake_case mapping per project convention)

### Hooks

In `frontend/src/hooks/useWorkspace.ts`:

- `useKeycloakUsers(slug: string, search: string)` — queryKey `['keycloak-users', slug, search]`, enabled when `search.length >= 2`
- `useAddWorkspaceMember()` — mutation input `{ slug, keycloakSub, email, name, role }`. On success: `qc.invalidateQueries({ queryKey: ['workspace-members', slug] })` (matching existing `useUpdateMemberRole` pattern)

### UI: Add Member Modal

**File:** `frontend/src/features/workspace/AddMemberModal.tsx`

- Props: `{ open: boolean; onClose: () => void; workspaceSlug: string }`
- `role="dialog"`, `aria-labelledby` pointing to modal title id, focus trap on open, Escape closes
- Search input with `aria-label="Buscar usuário"` (debounced 300 ms) drives `useKeycloakUsers`
- Results list (`role="list"`): avatar initials + name + email; keyboard-navigable
- Selecting a user shows a role dropdown (member / admin / guest) and "Adicionar" button
- On confirm: calls `useAddWorkspaceMember` with `{ slug: workspaceSlug, ...selectedUser, role }`, shows loading state, closes on success
- Empty state: "Nenhum usuário encontrado"
- Error state: displays API error message

### WorkspaceSettings Integration

**File:** `frontend/src/features/workspace/WorkspaceSettings.tsx`

- Members section header becomes a `flex` row: `<h2>` left, "Adicionar membro" button right
- Local `const [addOpen, setAddOpen] = useState(false)` controls the modal
- Render `<AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} workspaceSlug={slug} />`

---

## Error Handling

| Scenario | HTTP | Response |
|---|---|---|
| Keycloak admin unreachable | 503 | `{ detail: "keycloak_unavailable" }` |
| User already in workspace | 400 | `{ detail: "already_member" }` |
| Invalid role value | 400 | serializer validation error |
| Non-admin caller | 403 | default DRF forbidden |

---

## Accessibility

- Modal: `role="dialog"`, `aria-labelledby`, focus trap, Escape to close
- Search input: `aria-label`
- Results list: `role="list"` / `role="listitem"`, keyboard-navigable

---

## Testing

### Backend

- `GET /workspaces/{slug}/keycloak-users/` — success returns filtered list; non-admin gets 403; Keycloak unavailable returns 503
- `POST /workspaces/{slug}/members/create/` — success creates member and returns it; duplicate `keycloak_sub` returns 400 `already_member`; `IntegrityError` (race) also returns 400; invalid role returns 400; non-admin gets 403
- `WorkspaceMemberCreateSerializer` — validates all fields; rejects duplicate sub in `validate`
- `KeycloakAdminClient.search_users` — mock `python-keycloak`; success path; auth failure raises `KeycloakAdminUnavailable`
- **Role preservation:** create a member via `WorkspaceMemberCreateView` with `role="admin"`, then call `_get_or_create_member` with the same `keycloak_sub` — assert `role` is still `"admin"` after the call

### Frontend

- `AddMemberModal` — renders; search debounce triggers hook; selecting user enables confirm; confirm calls mutation with correct payload including snake_case transform; success closes modal; error message displayed
- `useKeycloakUsers` — not enabled when `search.length < 2`; enabled at length 2+
- `useAddWorkspaceMember` — invalidates `['workspace-members', slug]` on success

---

## Out of Scope

- Removing members (separate task)
- Syncing roles from Keycloak groups
- Bulk add
