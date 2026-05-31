# Workspace Add Keycloak Members — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow workspace admins to search existing Keycloak users and pre-add them as WorkspaceMember records before their first login.

**Architecture:** A `KeycloakAdminClient` utility in the auth app wraps `python-keycloak` and exposes user search. Two new workspace views handle the search endpoint and the create-member endpoint. The frontend adds a searchable modal to `WorkspaceSettings` backed by two new TanStack Query hooks.

**Tech Stack:** python-keycloak 7.1.1, Django REST Framework, React 18, TanStack Query, Radix UI Dialog (via existing `Modal` component), Vitest + Testing Library

---

## File Map

**Create:**
- `backend/apps/authentication/keycloak_admin.py` — KeycloakAdminClient wrapper + exception
- `backend/apps/authentication/tests/__init__.py` — package marker
- `backend/apps/authentication/tests/test_keycloak_admin.py` — unit tests for the client
- `backend/apps/workspaces/tests/__init__.py` — package marker
- `backend/apps/workspaces/tests/test_add_member.py` — view + serializer tests
- `frontend/src/features/workspace/AddMemberModal.tsx` — search-and-add modal
- `frontend/src/hooks/useDebounce.ts` — debounce hook (if not already present)
- `frontend/src/hooks/useWorkspace.test.ts` — hook unit tests
- `frontend/src/features/workspace/AddMemberModal.test.tsx` — modal component tests

**Modify:**
- `backend/requirements/base.txt` — add python-keycloak==7.1.1
- `backend/apps/workspaces/serializers.py` — add WorkspaceMemberCreateSerializer
- `backend/apps/workspaces/views.py` — add WorkspaceKeycloakUsersView + WorkspaceMemberCreateView
- `backend/apps/workspaces/urls.py` — register two new routes
- `frontend/src/types/workspace.ts` — add KeycloakUser interface
- `frontend/src/services/workspace.service.ts` — add keycloakUsers + addMember
- `frontend/src/hooks/useWorkspace.ts` — add useKeycloakUsers + useAddWorkspaceMember
- `frontend/src/features/workspace/WorkspaceSettings.tsx` — integrate AddMemberModal
- `CHANGELOG.md` — log changes

---

## Task 1: Add python-keycloak dependency

**Files:**
- Modify: `backend/requirements/base.txt:43-44`

- [ ] **Step 1: Add the dependency after the existing Keycloak-related entries**

In `backend/requirements/base.txt`, after line 44 (`cryptography==43.0.3`), add:

```
python-keycloak==7.1.1              # Keycloak Admin API (user search)
```

- [ ] **Step 2: Commit**

```bash
git add backend/requirements/base.txt
git commit -m "chore: add python-keycloak dependency"
```

---

## Task 2: KeycloakAdminClient utility + tests

**Files:**
- Create: `backend/apps/authentication/keycloak_admin.py`
- Create: `backend/apps/authentication/tests/__init__.py`
- Create: `backend/apps/authentication/tests/test_keycloak_admin.py`

- [ ] **Step 1: Create test package**

Create `backend/apps/authentication/tests/__init__.py` — empty file.

- [ ] **Step 2: Write the failing tests**

Create `backend/apps/authentication/tests/test_keycloak_admin.py`:

```python
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.authentication.keycloak_admin import KeycloakAdminUnavailable, search_users


class SearchUsersTest(TestCase):
    @patch("apps.authentication.keycloak_admin.KeycloakAdmin")
    def test_returns_mapped_user_list(self, MockAdmin):
        instance = MockAdmin.return_value
        instance.get_users.return_value = [
            {
                "id": "sub-abc",
                "email": "alice@example.com",
                "firstName": "Alice",
                "lastName": "Smith",
                "username": "alice",
            }
        ]
        result = search_users("alice")
        self.assertEqual(result, [{"sub": "sub-abc", "email": "alice@example.com", "name": "Alice Smith"}])
        instance.get_users.assert_called_once_with({"search": "alice", "max": 20})

    @patch("apps.authentication.keycloak_admin.KeycloakAdmin")
    def test_falls_back_to_username_when_name_empty(self, MockAdmin):
        instance = MockAdmin.return_value
        instance.get_users.return_value = [
            {"id": "sub-x", "email": "bot@example.com", "firstName": "", "lastName": "", "username": "botuser"}
        ]
        result = search_users("bot")
        self.assertEqual(result[0]["name"], "botuser")

    @patch("apps.authentication.keycloak_admin.KeycloakAdmin")
    def test_raises_unavailable_on_exception(self, MockAdmin):
        MockAdmin.side_effect = Exception("connection refused")
        with self.assertRaises(KeycloakAdminUnavailable):
            search_users("alice")
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
python manage.py test apps.authentication.tests.test_keycloak_admin -v 2
```
Expected: `ImportError` — `keycloak_admin` module does not exist yet.

- [ ] **Step 4: Implement the utility**

Create `backend/apps/authentication/keycloak_admin.py`:

```python
from django.conf import settings
from keycloak import KeycloakAdmin


class KeycloakAdminUnavailable(Exception):
    """Raised when the Keycloak Admin API is unreachable or auth fails."""


def search_users(query: str) -> list[dict]:
    """Search Keycloak users by query string.

    Returns up to 20 results as [{ sub, email, name }].
    Raises KeycloakAdminUnavailable on any Keycloak error.
    """
    try:
        admin = KeycloakAdmin(
            server_url=settings.KEYCLOAK_SERVER_URL + "/",
            realm_name=settings.KEYCLOAK_REALM,
            username=getattr(settings, "KEYCLOAK_ADMIN", ""),
            password=getattr(settings, "KEYCLOAK_ADMIN_PASSWORD", ""),
            verify=True,
        )
        results = admin.get_users({"search": query, "max": 20})
    except Exception as exc:
        raise KeycloakAdminUnavailable(str(exc)) from exc

    users = []
    for u in results:
        first = (u.get("firstName") or "").strip()
        last = (u.get("lastName") or "").strip()
        full_name = f"{first} {last}".strip() or u.get("username", "")
        users.append({"sub": u["id"], "email": u.get("email", ""), "name": full_name})
    return users
```

Also update `backend/config/settings/base.py`. In the `# AUTENTICAÇÃO — Keycloak OIDC` section, `KEYCLOAK_SERVER_URL` and `KEYCLOAK_REALM` are currently used inline in `config()` calls but are NOT stored as individual settings attributes — which means `settings.KEYCLOAK_SERVER_URL` would raise `AttributeError`. Fix this by adding three explicit settings attributes and refactoring the compound OIDC URL building to reference them.

Replace the block starting at `OIDC_RP_CLIENT_ID` through `OIDC_OP_USER_ENDPOINT` with:

```python
OIDC_RP_CLIENT_ID = config("KEYCLOAK_CLIENT_ID", default="projecthub-backend")
OIDC_RP_CLIENT_SECRET = config("KEYCLOAK_CLIENT_SECRET", default="")

# Stored as individual settings so other modules (keycloak_admin) can reference them
KEYCLOAK_SERVER_URL = config("KEYCLOAK_SERVER_URL", default="http://localhost:8080")
KEYCLOAK_REALM = config("KEYCLOAK_REALM", default="projecthub")
KEYCLOAK_ADMIN = config("KEYCLOAK_ADMIN", default="")
KEYCLOAK_ADMIN_PASSWORD = config("KEYCLOAK_ADMIN_PASSWORD", default="")

_KC_REALM_URL = KEYCLOAK_SERVER_URL + "/realms/" + KEYCLOAK_REALM
OIDC_OP_JWKS_ENDPOINT = _KC_REALM_URL + "/protocol/openid-connect/certs"
OIDC_OP_AUTHORIZATION_ENDPOINT = _KC_REALM_URL + "/protocol/openid-connect/auth"
OIDC_OP_TOKEN_ENDPOINT = _KC_REALM_URL + "/protocol/openid-connect/token"
OIDC_OP_USER_ENDPOINT = _KC_REALM_URL + "/protocol/openid-connect/userinfo"
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
python manage.py test apps.authentication.tests.test_keycloak_admin -v 2
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/authentication/keycloak_admin.py \
        backend/apps/authentication/tests/__init__.py \
        backend/apps/authentication/tests/test_keycloak_admin.py \
        backend/config/settings/base.py
git commit -m "feat: add KeycloakAdminClient for user search"
```

---

## Task 3: WorkspaceMemberCreateSerializer

**Files:**
- Modify: `backend/apps/workspaces/serializers.py`

- [ ] **Step 1: Write the failing serializer tests**

Create `backend/apps/workspaces/tests/__init__.py` — empty file.

Create `backend/apps/workspaces/tests/test_add_member.py` — start with the serializer section:

```python
from django.test import TestCase

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.workspaces.serializers import WorkspaceMemberCreateSerializer


def make_workspace():
    return Workspace.objects.create(name="Test", slug="test")


class WorkspaceMemberCreateSerializerTest(TestCase):
    def setUp(self):
        self.workspace = make_workspace()

    def test_valid_data_passes(self):
        s = WorkspaceMemberCreateSerializer(
            data={"keycloak_sub": "sub-1", "email": "a@b.com", "name": "Alice", "role": "member"}
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_invalid_role_fails(self):
        s = WorkspaceMemberCreateSerializer(
            data={"keycloak_sub": "sub-1", "email": "a@b.com", "name": "Alice", "role": "superadmin"}
        )
        self.assertFalse(s.is_valid())
        self.assertIn("role", s.errors)

    def test_missing_keycloak_sub_fails(self):
        s = WorkspaceMemberCreateSerializer(
            data={"email": "a@b.com", "name": "Alice", "role": "member"}
        )
        self.assertFalse(s.is_valid())
        self.assertIn("keycloak_sub", s.errors)
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd backend
python manage.py test apps.workspaces.tests.test_add_member.WorkspaceMemberCreateSerializerTest -v 2
```
Expected: `ImportError` — `WorkspaceMemberCreateSerializer` does not exist yet.

- [ ] **Step 3: Add the serializer**

Append to `backend/apps/workspaces/serializers.py`:

```python
class WorkspaceMemberCreateSerializer(serializers.Serializer):
    keycloak_sub = serializers.CharField(max_length=255)
    email = serializers.EmailField(max_length=255)
    name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=WorkspaceMember.Role.choices)
```

- [ ] **Step 4: Run to verify they pass**

```bash
cd backend
python manage.py test apps.workspaces.tests.test_add_member.WorkspaceMemberCreateSerializerTest -v 2
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/workspaces/serializers.py \
        backend/apps/workspaces/tests/__init__.py \
        backend/apps/workspaces/tests/test_add_member.py
git commit -m "feat: add WorkspaceMemberCreateSerializer"
```

---

## Task 4: Backend views + view tests

**Files:**
- Modify: `backend/apps/workspaces/views.py`
- Modify: `backend/apps/workspaces/tests/test_add_member.py` (append view tests)

- [ ] **Step 1: Write the failing view tests**

Append to `backend/apps/workspaces/tests/test_add_member.py`:

```python
import uuid
from unittest.mock import patch

from rest_framework.test import APIClient


def make_member(workspace, role="admin", sub=None):
    return WorkspaceMember.objects.create(
        workspace=workspace,
        keycloak_sub=sub or str(uuid.uuid4()),
        email="admin@test.com",
        name="Admin",
        role=role,
    )


class WorkspaceKeycloakUsersViewTest(TestCase):
    def setUp(self):
        self.workspace = make_workspace()
        self.admin = make_member(self.workspace, role="admin", sub="admin-sub")
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.url = f"/api/workspaces/{self.workspace.slug}/keycloak-users/"

    @patch("apps.workspaces.views.search_users")
    def test_returns_filtered_list(self, mock_search):
        # admin-sub is already a member; only new-sub should be returned
        mock_search.return_value = [
            {"sub": "admin-sub", "email": "admin@test.com", "name": "Admin"},
            {"sub": "new-sub", "email": "new@test.com", "name": "New User"},
        ]
        resp = self.client.get(self.url, {"search": "us"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["sub"], "new-sub")

    def test_requires_search_min_2_chars(self):
        resp = self.client.get(self.url, {"search": "a"})
        self.assertEqual(resp.status_code, 400)

    def test_non_admin_gets_403(self):
        member = make_member(self.workspace, role="member", sub="member-sub")
        self.client.force_authenticate(user=member)
        resp = self.client.get(self.url, {"search": "al"})
        self.assertEqual(resp.status_code, 403)

    @patch("apps.workspaces.views.search_users")
    def test_keycloak_unavailable_returns_503(self, mock_search):
        from apps.authentication.keycloak_admin import KeycloakAdminUnavailable
        mock_search.side_effect = KeycloakAdminUnavailable("down")
        resp = self.client.get(self.url, {"search": "al"})
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.data["detail"], "keycloak_unavailable")


class WorkspaceMemberCreateViewTest(TestCase):
    def setUp(self):
        self.workspace = make_workspace()
        self.admin = make_member(self.workspace, role="admin", sub="admin-sub")
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.url = f"/api/workspaces/{self.workspace.slug}/members/create/"

    def test_creates_member_and_returns_201(self):
        payload = {"keycloak_sub": "new-sub", "email": "new@test.com", "name": "New", "role": "member"}
        resp = self.client.post(self.url, payload, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(WorkspaceMember.objects.filter(workspace=self.workspace, keycloak_sub="new-sub").exists())

    def test_duplicate_returns_400_already_member(self):
        make_member(self.workspace, role="member", sub="dup-sub")
        payload = {"keycloak_sub": "dup-sub", "email": "dup@test.com", "name": "Dup", "role": "member"}
        resp = self.client.post(self.url, payload, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["detail"], "already_member")

    def test_invalid_role_returns_400(self):
        payload = {"keycloak_sub": "x-sub", "email": "x@test.com", "name": "X", "role": "god"}
        resp = self.client.post(self.url, payload, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_non_admin_gets_403(self):
        member = make_member(self.workspace, role="member", sub="member-sub")
        self.client.force_authenticate(user=member)
        payload = {"keycloak_sub": "y-sub", "email": "y@test.com", "name": "Y", "role": "member"}
        resp = self.client.post(self.url, payload, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_role_preserved_after_get_or_create_member(self):
        """Pre-added admin role must survive first-login provisioning."""
        from apps.authentication.authentication import KeycloakJWTAuthentication
        payload = {"keycloak_sub": "new-admin-sub", "email": "na@test.com", "name": "NA", "role": "admin"}
        resp = self.client.post(self.url, payload, format="json")
        self.assertEqual(resp.status_code, 201, resp.data)  # guard: ensure member was created

        auth = KeycloakJWTAuthentication()
        payload_jwt = {
            "sub": "new-admin-sub",
            "email": "na@test.com",
            "name": "NA",
            "preferred_username": "na",
        }
        # Simulate first login without a request (no X-Workspace-ID header).
        # _get_or_create_member will find the existing record via keycloak_sub filter.
        member = auth._get_or_create_member(payload_jwt)
        self.assertEqual(member.role, "admin")
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd backend
python manage.py test apps.workspaces.tests.test_add_member.WorkspaceKeycloakUsersViewTest apps.workspaces.tests.test_add_member.WorkspaceMemberCreateViewTest -v 2
```
Expected: failures because views don't exist yet.

- [ ] **Step 3: Add the two views**

Add to `backend/apps/workspaces/views.py` — add imports at the top:

```python
from django.db import IntegrityError
from rest_framework.views import APIView
```

Add import in the existing imports block:

```python
from apps.authentication.keycloak_admin import KeycloakAdminUnavailable, search_users
```

Add to the imports from `.serializers`:

```python
    WorkspaceMemberCreateSerializer,
```

Append two new view classes at the bottom of `backend/apps/workspaces/views.py`:

```python
class WorkspaceKeycloakUsersView(APIView):
    """GET /workspaces/{slug}/keycloak-users/?search=<query>"""

    permission_classes = [IsWorkspaceAdmin]

    def get(self, request, slug):
        query = request.query_params.get("search", "")
        if len(query) < 2:
            return Response(
                {"detail": "O parâmetro 'search' deve ter pelo menos 2 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace = _get_workspace(slug)
        try:
            kc_users = search_users(query)
        except KeycloakAdminUnavailable:
            return Response({"detail": "keycloak_unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        existing_subs = set(
            WorkspaceMember.objects.filter(workspace=workspace).values_list("keycloak_sub", flat=True)
        )
        filtered = [u for u in kc_users if u["sub"] not in existing_subs]
        return Response(filtered)


class WorkspaceMemberCreateView(APIView):
    """POST /workspaces/{slug}/members/create/"""

    permission_classes = [IsWorkspaceAdmin]

    def post(self, request, slug):
        serializer = WorkspaceMemberCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = _get_workspace(slug)

        keycloak_sub = serializer.validated_data["keycloak_sub"]
        if WorkspaceMember.objects.filter(workspace=workspace, keycloak_sub=keycloak_sub).exists():
            return Response({"detail": "already_member"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = WorkspaceMember.objects.create(workspace=workspace, **serializer.validated_data)
        except IntegrityError:
            return Response({"detail": "already_member"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(WorkspaceMemberSerializer(member).data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 4: Run all workspace tests**

```bash
cd backend
python manage.py test apps.workspaces.tests.test_add_member -v 2
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/workspaces/views.py \
        backend/apps/workspaces/tests/test_add_member.py
git commit -m "feat: add WorkspaceKeycloakUsersView and WorkspaceMemberCreateView"
```

---

## Task 5: Register URL routes

**Files:**
- Modify: `backend/apps/workspaces/urls.py`

- [ ] **Step 1: Register the new routes**

Replace the **entire contents** of `backend/apps/workspaces/urls.py` with the following (preserving all four existing routes and adding two new ones):

```python
from .views import (
    WorkspaceDetailView,
    WorkspaceKeycloakUsersView,
    WorkspaceListView,
    WorkspaceMemberCreateView,
    WorkspaceMemberListView,
    WorkspaceMemberUpdateView,
)

urlpatterns = [
    path("", WorkspaceListView.as_view(), name="workspace-list"),
    path("<slug:slug>/", WorkspaceDetailView.as_view(), name="workspace-detail"),
    path(
        "<slug:slug>/members/",
        WorkspaceMemberListView.as_view(),
        name="workspace-member-list",
    ),
    path(
        "<slug:slug>/members/<uuid:pk>/",
        WorkspaceMemberUpdateView.as_view(),
        name="workspace-member-update",
    ),
    path(
        "<slug:slug>/members/create/",
        WorkspaceMemberCreateView.as_view(),
        name="workspace-member-create",
    ),
    path(
        "<slug:slug>/keycloak-users/",
        WorkspaceKeycloakUsersView.as_view(),
        name="workspace-keycloak-users",
    ),
]
```

- [ ] **Step 2: Run all backend tests**

```bash
cd backend
python manage.py test apps.workspaces.tests apps.authentication.tests -v 2
```
Expected: all tests pass.

- [ ] **Step 3: Rebuild Docker image**

```bash
docker compose build api
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/workspaces/urls.py
git commit -m "feat: register keycloak-users and members/create routes"
```

---

## Task 6: Frontend types + service methods + service tests

**Files:**
- Modify: `frontend/src/types/workspace.ts`
- Modify: `frontend/src/services/workspace.service.ts`

- [ ] **Step 1: Add KeycloakUser type**

Append to `frontend/src/types/workspace.ts`:

```ts
export interface KeycloakUser {
  sub: string
  email: string
  name: string
}
```

- [ ] **Step 2: Add service methods**

In `frontend/src/services/workspace.service.ts`, add the two new methods inside `workspaceService`:

```ts
  keycloakUsers: (slug: string, search: string): Promise<KeycloakUser[]> =>
    api
      .get<KeycloakUser[]>(`/workspaces/${slug}/keycloak-users/`, { params: { search } })
      .then((r) => r.data),

  addMember: (
    slug: string,
    data: { keycloakSub: string; email: string; name: string; role: string },
  ): Promise<WorkspaceMember> =>
    api
      .post<WorkspaceMember>(`/workspaces/${slug}/members/create/`, {
        keycloak_sub: data.keycloakSub,
        email: data.email,
        name: data.name,
        role: data.role,
      })
      .then((r) => r.data),
```

Add `KeycloakUser` to the import from `@/types`:

```ts
import type { PaginatedResponse, Workspace, WorkspaceMember, KeycloakUser } from '@/types'
```

Also export `KeycloakUser` from `frontend/src/types/index.ts` — add it to the workspace re-export.

- [ ] **Step 3: Verify types**

```bash
cd frontend
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/workspace.ts \
        frontend/src/types/index.ts \
        frontend/src/services/workspace.service.ts
git commit -m "feat: add KeycloakUser type and workspace service methods"
```

---

## Task 7: Frontend hooks + hook tests

**Files:**
- Modify: `frontend/src/hooks/useWorkspace.ts`
- Create: `frontend/src/hooks/useWorkspace.test.ts`

- [ ] **Step 1: Write the failing hook tests**

Create `frontend/src/hooks/useWorkspace.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useKeycloakUsers } from './useWorkspace'

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    keycloakUsers: vi.fn().mockResolvedValue([{ sub: 'a', email: 'a@b.com', name: 'Alice' }]),
    addMember: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', role: 'member' }),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({}),
    members: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateMemberRole: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({}),
  },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useKeycloakUsers', () => {
  it('is disabled when search length < 2', () => {
    const { result } = renderHook(() => useKeycloakUsers('my-ws', 'a'), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is enabled when search length >= 2', async () => {
    const { result } = renderHook(() => useKeycloakUsers('my-ws', 'al'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd frontend
npm run test -- useWorkspace.test
```
Expected: fails — `useKeycloakUsers` not exported yet.

- [ ] **Step 3: Add the hooks**

Append to `frontend/src/hooks/useWorkspace.ts`:

```ts
import type { KeycloakUser } from '@/types'

export function useKeycloakUsers(slug: string, search: string) {
  return useQuery({
    queryKey: ['keycloak-users', slug, search],
    queryFn: () => workspaceService.keycloakUsers(slug, search),
    enabled: !!slug && search.length >= 2,
  })
}

export function useAddWorkspaceMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      slug,
      keycloakSub,
      email,
      name,
      role,
    }: {
      slug: string
      keycloakSub: string
      email: string
      name: string
      role: string
    }) => workspaceService.addMember(slug, { keycloakSub, email, name, role }),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', slug] })
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend
npm run test -- useWorkspace.test
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useWorkspace.ts \
        frontend/src/hooks/useWorkspace.test.ts
git commit -m "feat: add useKeycloakUsers and useAddWorkspaceMember hooks"
```

---

## Task 8: AddMemberModal component + tests

**Files:**
- Create: `frontend/src/features/workspace/AddMemberModal.tsx`
- Create: `frontend/src/features/workspace/AddMemberModal.test.tsx`

- [ ] **Step 1: Ensure useDebounce hook exists**

Check if it already exists:
```bash
ls frontend/src/hooks/useDebounce.ts 2>/dev/null && echo "exists" || echo "missing"
```

If missing, create `frontend/src/hooks/useDebounce.ts`:

```ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
```

- [ ] **Step 2: Write the failing component tests**

Create `frontend/src/features/workspace/AddMemberModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from './AddMemberModal'

const mockMutate = vi.fn()

vi.mock('@/hooks/useWorkspace', () => ({
  useKeycloakUsers: vi.fn(() => ({ data: [], isLoading: false })),
  useAddWorkspaceMember: vi.fn(() => ({ mutate: mockMutate, isPending: false, error: null })),
}))

import { useKeycloakUsers } from '@/hooks/useWorkspace'

describe('AddMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal title when open', () => {
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.getByText('Adicionar membro')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddMemberModal open={false} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.queryByText('Adicionar membro')).not.toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    // Use getByRole('searchbox') — works because we pass type="search" to Input
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'al' } })
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
  })

  it('shows users from hook and allows selection', async () => {
    vi.mocked(useKeycloakUsers).mockReturnValue({
      data: [{ sub: 'sub-1', email: 'alice@test.com', name: 'Alice' }],
      isLoading: false,
    } as ReturnType<typeof useKeycloakUsers>)
    render(<AddMemberModal open={true} onClose={vi.fn()} workspaceSlug="my-ws" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Alice'))
    expect(screen.getByRole('button', { name: /adicionar/i })).not.toBeDisabled()
  })
})
```

- [ ] **Step 3: Run to verify they fail**

```bash
cd frontend
npm run test -- AddMemberModal.test
```
Expected: fails — component file does not exist.

- [ ] **Step 4: Implement AddMemberModal**

Create `frontend/src/features/workspace/AddMemberModal.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useKeycloakUsers, useAddWorkspaceMember } from '@/hooks/useWorkspace'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import type { KeycloakUser } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

interface Props {
  open: boolean
  onClose: () => void
  workspaceSlug: string
}

const ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Administrador' },
  { value: 'guest', label: 'Convidado' },
]

export function AddMemberModal({ open, onClose, workspaceSlug }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<KeycloakUser | null>(null)
  const [role, setRole] = useState('member')
  const debouncedSearch = useDebounce(search, 300)

  const { data: users = [], isLoading } = useKeycloakUsers(workspaceSlug, debouncedSearch)
  const addMember = useAddWorkspaceMember()

  const handleClose = useCallback(() => {
    setSearch('')
    setSelected(null)
    setRole('member')
    onClose()
  }, [onClose])

  function handleConfirm() {
    if (!selected) return
    addMember.mutate(
      { slug: workspaceSlug, keycloakSub: selected.sub, email: selected.email, name: selected.name, role },
      { onSuccess: handleClose },
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Adicionar membro" size="md">
      <div className="space-y-4">
        <Input
          type="search"
          aria-label="Buscar usuário"
          placeholder="Buscar por nome ou e-mail…"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
        />

        {search.length >= 2 && (
          <ul role="list" className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            {isLoading && (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Buscando…</li>
            )}
            {!isLoading && users.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Nenhum usuário encontrado</li>
            )}
            {users.map((u) => (
              <li
                key={u.sub}
                role="listitem"
                tabIndex={0}
                aria-selected={selected?.sub === u.sub}
                onClick={() => setSelected(u)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(u)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
                  selected?.sub === u.sub
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Avatar name={u.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="flex items-center gap-2">
            <label htmlFor="role-select" className="text-sm text-gray-700 dark:text-gray-300 shrink-0">
              Papel:
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {addMember.error && (
          <p role="alert" className="text-sm text-red-500">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(addMember.error as any)?.response?.data?.detail === 'already_member'
              ? 'Este usuário já é membro do workspace.'
              : 'Ocorreu um erro. Tente novamente.'}
          </p>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
        <Button
          size="sm"
          disabled={!selected || addMember.isPending}
          loading={addMember.isPending}
          onClick={handleConfirm}
          aria-label="Adicionar membro selecionado"
        >
          Adicionar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
```

> **Note:** This component uses `useDebounce`. Check if it already exists:
> ```bash
> find frontend/src/hooks -name "useDebounce*"
> ```
> If missing, create `frontend/src/hooks/useDebounce.ts`:
> ```ts
> import { useState, useEffect } from 'react'
> export function useDebounce<T>(value: T, delay: number): T {
>   const [debounced, setDebounced] = useState(value)
>   useEffect(() => {
>     const t = setTimeout(() => setDebounced(value), delay)
>     return () => clearTimeout(t)
>   }, [value, delay])
>   return debounced
> }
> ```

- [ ] **Step 5: Run component tests**

```bash
cd frontend
npm run test -- AddMemberModal.test
```
Expected: all tests pass.

- [ ] **Step 6: Type-check**

```bash
cd frontend
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/workspace/AddMemberModal.tsx \
        frontend/src/features/workspace/AddMemberModal.test.tsx \
        frontend/src/hooks/useDebounce.ts
git commit -m "feat: add AddMemberModal component"
```

---

## Task 9: Integrate modal into WorkspaceSettings

**Files:**
- Modify: `frontend/src/features/workspace/WorkspaceSettings.tsx`

- [ ] **Step 1: Update WorkspaceSettings**

Replace `WorkspaceSettings.tsx` with:

```tsx
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaceMembers } from '@/hooks/useWorkspace'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AddMemberModal } from './AddMemberModal'

export function WorkspaceSettings() {
  const { workspace } = useWorkspaceStore()
  const { data: members = [] } = useWorkspaceMembers(workspace?.slug ?? '')
  const [addOpen, setAddOpen] = useState(false)

  if (!workspace) return null

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Configurações do Workspace
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Informações</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{workspace.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{workspace.slug}</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Membros ({members.length})
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddOpen(true)}
            aria-label="Adicionar membro ao workspace"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar membro
          </Button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.avatarUrl} name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
              </div>
              <Badge variant={m.role === 'admin' ? 'info' : 'default'}>
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        workspaceSlug={workspace.slug}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check and lint**

```bash
cd frontend
npm run typecheck && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/workspace/WorkspaceSettings.tsx
git commit -m "feat: integrate AddMemberModal into WorkspaceSettings"
```

---

## Task 10: Update docs + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/ARCHITECTURE.md` (env-vars table)

- [ ] **Step 1: Add env-vars to ARCHITECTURE.md**

In `docs/ARCHITECTURE.md`, find the environment variables table and add:

```
| `KEYCLOAK_ADMIN`          | Backend — Keycloak Admin API username (service account with `view-users` role) |
| `KEYCLOAK_ADMIN_PASSWORD` | Backend — Keycloak Admin API password |
```

- [ ] **Step 2: Update CHANGELOG.md**

Add an entry at the top of `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- Workspace admins can search Keycloak users and pre-add them as workspace members before their first login
- `GET /api/workspaces/{slug}/keycloak-users/?search=` — searches Keycloak, filters existing members
- `POST /api/workspaces/{slug}/members/create/` — creates a WorkspaceMember record
- `AddMemberModal` component in WorkspaceSettings with debounced search, role selector, and error feedback
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md docs/ARCHITECTURE.md
git commit -m "docs: update ARCHITECTURE env-vars and CHANGELOG for add-member feature"
```

---

## Task 11: Full test run + verification

- [ ] **Run all backend tests**

```bash
cd backend
python manage.py test apps.workspaces.tests apps.authentication.tests -v 2
```
Expected: all tests pass.

- [ ] **Run all frontend tests**

```bash
cd frontend
npm run test
```
Expected: all tests pass.

- [ ] **Run frontend typecheck**

```bash
cd frontend
npm run typecheck
```
Expected: no errors.

- [ ] **Rebuild and verify Docker stack starts**

```bash
docker compose build api && docker compose up -d api nginx
docker compose logs api --tail=20
```
Expected: API starts cleanly with no import errors.
