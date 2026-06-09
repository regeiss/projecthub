# Access Request Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the create-workspace wizard for new Keycloak users with a "Request Access" form; admins approve/deny from a workspace settings tab with in-app notifications and email.

**Architecture:** New `apps/access_requests/` Django app owns the model, serializers, views, and email tasks. Two endpoint groups: bootstrap endpoints under `/api/v1/auth/access-requests/` (JWT-only, bypass DRF auth) and admin endpoints under `/api/v1/workspaces/{slug}/access-requests/`. Frontend adds a `RequestAccessPage` with three internal states (form / pending / denial-banner), modifies `AuthProvider` to redirect there instead of `/onboarding`, and adds a "Solicitações" tab to `WorkspaceSettings`.

**Tech Stack:** Django + DRF, Celery (notifications queue), Vitest + React Testing Library, TanStack Query, Zustand, Tailwind CSS, Framer Motion.

---

## File Map

**Backend — new**
- `backend/apps/access_requests/__init__.py`
- `backend/apps/access_requests/apps.py`
- `backend/apps/access_requests/models.py`
- `backend/apps/access_requests/migrations/0001_initial.py` (generated)
- `backend/apps/access_requests/serializers.py`
- `backend/apps/access_requests/views.py`
- `backend/apps/access_requests/tasks.py`
- `backend/apps/access_requests/urls_auth.py`
- `backend/apps/access_requests/urls_workspace.py`
- `backend/apps/access_requests/tests/__init__.py`
- `backend/apps/access_requests/tests/test_models.py`
- `backend/apps/access_requests/tests/test_views.py`

**Backend — modified**
- `backend/config/settings/base.py` — add app + Celery route
- `backend/config/urls.py` — include new URL modules
- `backend/apps/workspaces/urls.py` — add access-requests routes
- `backend/apps/authentication/urls.py` — add access-requests routes
- `backend/apps/notifications/models.py` — add ACCESS_REQUEST type

**Frontend — new**
- `frontend/src/types/accessRequest.ts`
- `frontend/src/services/accessRequest.service.ts`
- `frontend/src/hooks/useAccessRequest.ts`
- `frontend/src/features/auth/RequestAccessPage.tsx`
- `frontend/src/features/workspace/AccessRequestsTab.tsx`

**Frontend — modified**
- `frontend/src/features/auth/AuthProvider.tsx`
- `frontend/src/App.tsx`
- `frontend/src/features/workspace/WorkspaceSettings.tsx`

---

## Task 1: AccessRequest model + app scaffold

**Files:**
- Create: `backend/apps/access_requests/__init__.py`
- Create: `backend/apps/access_requests/apps.py`
- Create: `backend/apps/access_requests/models.py`
- Create: `backend/apps/access_requests/tests/__init__.py`

- [ ] **Step 1: Create app scaffold**

```bash
cd backend
mkdir -p apps/access_requests/tests apps/access_requests/migrations
touch apps/access_requests/__init__.py
touch apps/access_requests/migrations/__init__.py
touch apps/access_requests/tests/__init__.py
```

- [ ] **Step 2: Write `apps.py`**

```python
# backend/apps/access_requests/apps.py
from django.apps import AppConfig

class AccessRequestsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.access_requests"
    verbose_name = "Access Requests"
```

- [ ] **Step 3: Write `models.py`**

```python
# backend/apps/access_requests/models.py
import uuid
from django.db import models


class AccessRequest(models.Model):
    class Status(models.TextChoices):
        PENDING  = "pending",  "Pendente"
        APPROVED = "approved", "Aprovado"
        DENIED   = "denied",   "Negado"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    keycloak_sub     = models.CharField(max_length=255, db_index=True)
    email            = models.EmailField(max_length=255)
    name             = models.CharField(max_length=255)
    workspace        = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="access_requests",
    )
    workspace_name   = models.CharField(max_length=255)
    secretaria       = models.CharField(max_length=120)
    reason           = models.TextField(blank=True)
    status           = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    denial_reason    = models.TextField(blank=True)
    requested_at     = models.DateTimeField(auto_now_add=True)
    resolved_at      = models.DateTimeField(null=True, blank=True)
    resolved_by      = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="resolved_access_requests",
    )
    previous_request = models.ForeignKey(
        "self", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="re_requests",
    )

    class Meta:
        db_table = "access_requests"
        ordering = ["-requested_at"]

    def __str__(self):
        return f"{self.name} ({self.email}) → {self.workspace_name}"
```

- [ ] **Step 4: Register app in settings and generate migration**

In `backend/config/settings/base.py`, inside `LOCAL_APPS`, add `"apps.access_requests"` after `"apps.authentication"`:

```python
LOCAL_APPS = [
    "apps.authentication",
    "apps.access_requests",   # ← add this line
    "apps.workspaces",
    # ... rest unchanged
]
```

Then generate migration:

```bash
cd backend
python manage.py makemigrations access_requests
```

Expected output: `Migrations for 'access_requests': apps/access_requests/migrations/0001_initial.py`

- [ ] **Step 5: Apply migration**

```bash
python manage.py migrate access_requests
```

Expected: `Applying access_requests.0001_initial... OK`

- [ ] **Step 6: Commit**

```bash
git add backend/apps/access_requests/ backend/config/settings/base.py
git commit -m "feat(access-requests): add AccessRequest model and app scaffold"
```

---

## Task 2: Model tests

**Files:**
- Create: `backend/apps/access_requests/tests/test_models.py`

- [ ] **Step 1: Write failing model tests**

```python
# backend/apps/access_requests/tests/test_models.py
import uuid
from django.test import TestCase
from django.utils import timezone

from apps.access_requests.models import AccessRequest
from apps.workspaces.models import Workspace, WorkspaceMember


def _workspace(name="Test WS"):
    return Workspace.objects.create(name=name, slug=f"test-ws-{uuid.uuid4().hex[:6]}")


def _member(ws, sub=None, role="admin"):
    sub = sub or uuid.uuid4().hex
    return WorkspaceMember.objects.create(
        workspace=ws, keycloak_sub=sub,
        email=f"{sub}@test.com", name="Test User", role=role,
    )


def _request(ws=None, sub=None, status=AccessRequest.Status.PENDING, **kwargs):
    ws = ws or _workspace()
    return AccessRequest.objects.create(
        keycloak_sub=sub or uuid.uuid4().hex,
        email="user@test.com",
        name="Test User",
        workspace=ws,
        workspace_name=ws.name,
        secretaria="TI",
        status=status,
        **kwargs,
    )


class AccessRequestModelTests(TestCase):
    def test_new_request_defaults_to_pending(self):
        req = _request()
        self.assertEqual(req.status, AccessRequest.Status.PENDING)
        self.assertIsNone(req.resolved_at)
        self.assertIsNone(req.resolved_by)

    def test_str_representation(self):
        ws = _workspace("Secretaria")
        req = _request(ws=ws)
        self.assertIn("Secretaria", str(req))

    def test_re_request_links_previous_denied(self):
        ws = _workspace()
        sub = uuid.uuid4().hex
        denied = _request(ws=ws, sub=sub, status=AccessRequest.Status.DENIED)
        new_req = _request(ws=ws, sub=sub, previous_request=denied)
        self.assertEqual(new_req.previous_request, denied)
        denied.refresh_from_db()
        self.assertEqual(denied.status, AccessRequest.Status.DENIED)  # old row unchanged

    def test_approval_sets_resolved_fields(self):
        ws = _workspace()
        admin = _member(ws)
        req = _request(ws=ws)
        req.status = AccessRequest.Status.APPROVED
        req.resolved_at = timezone.now()
        req.resolved_by = admin
        req.save()
        req.refresh_from_db()
        self.assertEqual(req.status, AccessRequest.Status.APPROVED)
        self.assertIsNotNone(req.resolved_at)
        self.assertEqual(req.resolved_by, admin)
```

- [ ] **Step 2: Run tests to confirm they pass (model itself is already implemented)**

```bash
cd backend
python manage.py test apps.access_requests.tests.test_models -v 2
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/access_requests/tests/test_models.py
git commit -m "test(access-requests): add AccessRequest model tests"
```

---

## Task 3: Serializers

**Files:**
- Create: `backend/apps/access_requests/serializers.py`

- [ ] **Step 1: Write serializers**

```python
# backend/apps/access_requests/serializers.py
from rest_framework import serializers
from .models import AccessRequest


class AccessRequestSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(read_only=True)

    class Meta:
        model = AccessRequest
        fields = [
            "id", "status", "workspace_name", "denial_reason",
            "requested_at", "resolved_at",
        ]
        read_only_fields = fields


class AccessRequestDetailSerializer(serializers.ModelSerializer):
    """Used by admin list view — includes requester info and previous request summary."""
    previous_denial_count = serializers.SerializerMethodField()

    class Meta:
        model = AccessRequest
        fields = [
            "id", "keycloak_sub", "email", "name", "workspace", "workspace_name",
            "secretaria", "reason", "status", "denial_reason",
            "requested_at", "resolved_at", "resolved_by",
            "previous_denial_count",
        ]

    def get_previous_denial_count(self, obj):
        count = 0
        cur = obj.previous_request
        while cur is not None:
            count += 1
            cur = cur.previous_request
        return count


class AdminResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "deny"])
    extra_workspace_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list,
    )
    denial_reason = serializers.CharField(required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=["admin", "member", "guest"], required=False, default="member",
    )

    def validate(self, data):
        if data["action"] == "deny" and not data.get("denial_reason", "").strip():
            raise serializers.ValidationError(
                {"denial_reason": "Motivo de negação é obrigatório."}
            )
        return data
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/access_requests/serializers.py
git commit -m "feat(access-requests): add serializers"
```

---

## Task 4: Submit and status-poll views

**Files:**
- Create: `backend/apps/access_requests/views.py` (partial — submit + poll)
- Create: `backend/apps/access_requests/urls_auth.py`

- [ ] **Step 1: Write failing test for submit endpoint**

```python
# backend/apps/access_requests/tests/test_views.py
import uuid
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.access_requests.models import AccessRequest
from apps.workspaces.models import Workspace, WorkspaceMember


def _workspace(name="WS"):
    return Workspace.objects.create(name=name, slug=f"ws-{uuid.uuid4().hex[:6]}")


def _fake_payload(sub=None, email="user@test.com", name="Test User"):
    return {
        "sub": sub or uuid.uuid4().hex,
        "email": email,
        "name": name,
        "realm_access": {"roles": []},
    }


class SubmitViewTests(TestCase):
    def setUp(self):
        self.ws = _workspace()

    @patch("apps.access_requests.views._decode_jwt")
    @patch("apps.access_requests.views.notify_admins_of_new_request")
    def test_submit_creates_pending_request(self, mock_notify, mock_decode):
        payload = _fake_payload()
        mock_decode.return_value = payload
        resp = self.client.post(
            "/api/v1/auth/access-requests/",
            data={
                "workspace_id": str(self.ws.id),
                "workspace_name": self.ws.name,
                "secretaria": "TI",
                "reason": "Need access",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(AccessRequest.objects.filter(keycloak_sub=payload["sub"]).count(), 1)
        req = AccessRequest.objects.get(keycloak_sub=payload["sub"])
        self.assertEqual(req.status, AccessRequest.Status.PENDING)
        mock_notify.assert_called_once()

    @patch("apps.access_requests.views._decode_jwt")
    @patch("apps.access_requests.views.notify_admins_of_new_request")
    def test_submit_idempotent_for_existing_pending(self, mock_notify, mock_decode):
        payload = _fake_payload()
        mock_decode.return_value = payload
        AccessRequest.objects.create(
            keycloak_sub=payload["sub"], email=payload["email"],
            name=payload["name"], workspace=self.ws,
            workspace_name=self.ws.name, secretaria="TI",
        )
        resp = self.client.post(
            "/api/v1/auth/access-requests/",
            data={"workspace_id": str(self.ws.id), "workspace_name": self.ws.name, "secretaria": "TI"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(AccessRequest.objects.filter(keycloak_sub=payload["sub"]).count(), 1)
        mock_notify.assert_not_called()

    @patch("apps.access_requests.views._decode_jwt")
    @patch("apps.access_requests.views.notify_admins_of_new_request")
    def test_submit_links_previous_denied_request(self, mock_notify, mock_decode):
        payload = _fake_payload()
        mock_decode.return_value = payload
        denied = AccessRequest.objects.create(
            keycloak_sub=payload["sub"], email=payload["email"],
            name=payload["name"], workspace=self.ws,
            workspace_name=self.ws.name, secretaria="TI",
            status=AccessRequest.Status.DENIED,
        )
        resp = self.client.post(
            "/api/v1/auth/access-requests/",
            data={"workspace_id": str(self.ws.id), "workspace_name": self.ws.name, "secretaria": "TI"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 201)
        new_req = AccessRequest.objects.get(
            keycloak_sub=payload["sub"], status=AccessRequest.Status.PENDING
        )
        self.assertEqual(new_req.previous_request, denied)

    def test_submit_without_token_returns_401(self):
        resp = self.client.post(
            "/api/v1/auth/access-requests/",
            data={"workspace_name": "WS", "secretaria": "TI"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)


class StatusPollViewTests(TestCase):
    def setUp(self):
        self.ws = _workspace()

    @patch("apps.access_requests.views._decode_jwt")
    def test_poll_returns_latest_request_status(self, mock_decode):
        payload = _fake_payload()
        mock_decode.return_value = payload
        AccessRequest.objects.create(
            keycloak_sub=payload["sub"], email=payload["email"],
            name=payload["name"], workspace=self.ws,
            workspace_name=self.ws.name, secretaria="TI",
        )
        resp = self.client.get(
            "/api/v1/auth/access-requests/me/",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "pending")
        self.assertEqual(resp.data["workspace_name"], self.ws.name)

    @patch("apps.access_requests.views._decode_jwt")
    def test_poll_returns_404_when_no_request(self, mock_decode):
        mock_decode.return_value = _fake_payload()
        resp = self.client.get(
            "/api/v1/auth/access-requests/me/",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 404)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
python manage.py test apps.access_requests.tests.test_views.SubmitViewTests apps.access_requests.tests.test_views.StatusPollViewTests -v 2
```

Expected: `ImportError` or 404 URL errors (views don't exist yet).

- [ ] **Step 3: Write submit + poll views**

```python
# backend/apps/access_requests/views.py
import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.authentication import _decode_jwt
from apps.workspaces.models import Workspace

from .models import AccessRequest
from .serializers import AccessRequestSerializer

logger = logging.getLogger(__name__)


def _decode_from_request(request):
    """Extract and decode Bearer JWT. Returns payload dict or raises ValueError."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise ValueError("Token necessário.")
    token = auth.split(" ", 1)[1]
    import jwt as pyjwt
    from rest_framework.exceptions import AuthenticationFailed
    try:
        return _decode_jwt(token)
    except pyjwt.ExpiredSignatureError:
        raise ValueError("Token expirado.")
    except Exception as exc:
        raise ValueError(f"Token inválido: {exc}")


def notify_admins_of_new_request(access_request):
    """Fire-and-forget: queue Celery task to notify each workspace admin."""
    if not access_request.workspace:
        return
    from apps.workspaces.models import WorkspaceMember
    from .tasks import send_admin_notification
    admins = WorkspaceMember.objects.filter(
        workspace=access_request.workspace, role="admin", is_active=True,
    )
    for admin in admins:
        send_admin_notification.delay(str(access_request.id), str(admin.id))


class AccessRequestSubmitView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            payload = _decode_from_request(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=401)

        sub   = payload.get("sub")
        email = payload.get("email", "")
        name  = payload.get("name") or payload.get("preferred_username", "")

        workspace_id   = request.data.get("workspace_id")
        workspace_name = request.data.get("workspace_name", "").strip()
        secretaria     = request.data.get("secretaria", "").strip()
        reason         = request.data.get("reason", "").strip()

        workspace = None
        if workspace_id:
            workspace = Workspace.objects.filter(pk=workspace_id).first()
        if workspace and not workspace_name:
            workspace_name = workspace.name

        if not workspace_name or not secretaria:
            return Response(
                {"detail": "workspace_name e secretaria são obrigatórios."}, status=400
            )

        # Idempotency: return existing pending request
        existing = AccessRequest.objects.filter(
            keycloak_sub=sub, status=AccessRequest.Status.PENDING,
        ).first()
        if existing:
            return Response(AccessRequestSerializer(existing).data, status=200)

        # Link to last denied request for history
        previous = AccessRequest.objects.filter(
            keycloak_sub=sub, status=AccessRequest.Status.DENIED,
        ).order_by("-requested_at").first()

        req = AccessRequest.objects.create(
            keycloak_sub=sub,
            email=email,
            name=name,
            workspace=workspace,
            workspace_name=workspace_name,
            secretaria=secretaria,
            reason=reason,
            previous_request=previous,
        )

        notify_admins_of_new_request(req)

        return Response(AccessRequestSerializer(req).data, status=201)


class AccessRequestStatusView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            payload = _decode_from_request(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=401)

        sub = payload.get("sub")
        req = AccessRequest.objects.filter(
            keycloak_sub=sub,
        ).order_by("-requested_at").first()

        if not req:
            return Response({"detail": "Nenhuma solicitação encontrada."}, status=404)

        return Response(AccessRequestSerializer(req).data)
```

- [ ] **Step 4: Write `urls_auth.py`**

```python
# backend/apps/access_requests/urls_auth.py
from django.urls import path
from .views import AccessRequestSubmitView, AccessRequestStatusView

urlpatterns = [
    path("", AccessRequestSubmitView.as_view(), name="access-request-submit"),
    path("me/", AccessRequestStatusView.as_view(), name="access-request-status"),
]
```

- [ ] **Step 5: Wire auth URLs into `backend/config/urls.py`**

Open `backend/config/urls.py` and add inside `urlpatterns`:

```python
path("api/v1/auth/access-requests/", include("apps.access_requests.urls_auth")),
```

Add it directly after the existing `path("api/v1/auth/", ...)` line.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
python manage.py test apps.access_requests.tests.test_views.SubmitViewTests apps.access_requests.tests.test_views.StatusPollViewTests -v 2
```

Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/access_requests/views.py backend/apps/access_requests/urls_auth.py backend/config/urls.py
git commit -m "feat(access-requests): add submit and status-poll endpoints"
```

---

## Task 5: Admin list and resolve views

**Files:**
- Modify: `backend/apps/access_requests/views.py` (add admin views)
- Create: `backend/apps/access_requests/urls_workspace.py`
- Modify: `backend/apps/workspaces/urls.py`

- [ ] **Step 1: Write failing tests for admin endpoints**

Append to `backend/apps/access_requests/tests/test_views.py`:

```python
class AdminListViewTests(TestCase):
    def setUp(self):
        self.ws = _workspace()
        self.admin = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub=uuid.uuid4().hex,
            email="admin@test.com", name="Admin", role="admin",
        )
        self.req = AccessRequest.objects.create(
            keycloak_sub=uuid.uuid4().hex, email="user@test.com",
            name="User", workspace=self.ws, workspace_name=self.ws.name,
            secretaria="TI",
        )

    def _auth(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        # Use request.user mock via force_authenticate-style workaround:
        # patch the authentication class to return self.admin
        return self.admin

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    def test_admin_can_list_requests(self, mock_auth):
        mock_auth.return_value = (self.admin, None)
        resp = self.client.get(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["results"]), 1)

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    def test_non_admin_gets_403(self, mock_auth):
        member = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub=uuid.uuid4().hex,
            email="member@test.com", name="Member", role="member",
        )
        mock_auth.return_value = (member, None)
        resp = self.client.get(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 403)


class AdminResolveViewTests(TestCase):
    def setUp(self):
        self.ws = _workspace()
        self.admin = WorkspaceMember.objects.create(
            workspace=self.ws, keycloak_sub=uuid.uuid4().hex,
            email="admin@test.com", name="Admin", role="admin",
        )
        self.req = AccessRequest.objects.create(
            keycloak_sub=uuid.uuid4().hex, email="user@test.com",
            name="User", workspace=self.ws, workspace_name=self.ws.name,
            secretaria="TI",
        )

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    @patch("apps.access_requests.views.send_requester_email")
    def test_approve_creates_workspace_member(self, mock_email, mock_auth):
        mock_auth.return_value = (self.admin, None)
        resp = self.client.patch(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/{self.req.id}/",
            data={"action": "approve"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, AccessRequest.Status.APPROVED)
        from apps.workspaces.models import WorkspaceMember
        self.assertTrue(
            WorkspaceMember.objects.filter(
                keycloak_sub=self.req.keycloak_sub, workspace=self.ws
            ).exists()
        )
        mock_email.delay.assert_called_once()

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    @patch("apps.access_requests.views.send_requester_email")
    def test_approve_with_extra_workspaces(self, mock_email, mock_auth):
        mock_auth.return_value = (self.admin, None)
        ws2 = _workspace("WS2")
        resp = self.client.patch(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/{self.req.id}/",
            data={"action": "approve", "extra_workspace_ids": [str(ws2.id)]},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        from apps.workspaces.models import WorkspaceMember
        self.assertEqual(
            WorkspaceMember.objects.filter(keycloak_sub=self.req.keycloak_sub).count(), 2
        )

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    @patch("apps.access_requests.views.send_requester_email")
    def test_deny_sets_denial_reason(self, mock_email, mock_auth):
        mock_auth.return_value = (self.admin, None)
        resp = self.client.patch(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/{self.req.id}/",
            data={"action": "deny", "denial_reason": "Sem vagas."},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 200)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, AccessRequest.Status.DENIED)
        self.assertEqual(self.req.denial_reason, "Sem vagas.")
        mock_email.delay.assert_called_once()

    @patch("apps.access_requests.views.KeycloakJWTAuthentication.authenticate")
    def test_deny_without_reason_returns_400(self, mock_auth):
        mock_auth.return_value = (self.admin, None)
        resp = self.client.patch(
            f"/api/v1/workspaces/{self.ws.slug}/access-requests/{self.req.id}/",
            data={"action": "deny"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer faketoken",
        )
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
python manage.py test apps.access_requests.tests.test_views.AdminListViewTests apps.access_requests.tests.test_views.AdminResolveViewTests -v 2
```

Expected: URL resolution errors (views not yet wired).

- [ ] **Step 3: Add admin views to `views.py`**

Append to `backend/apps/access_requests/views.py`:

```python
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.authentication.authentication import KeycloakJWTAuthentication
from apps.workspaces.models import Workspace, WorkspaceMember
from core.pagination import StandardPagination

from .serializers import AccessRequestDetailSerializer, AdminResolveSerializer


def _get_workspace_or_404(slug):
    try:
        return Workspace.objects.get(slug=slug)
    except Workspace.DoesNotExist:
        raise NotFound(f"Workspace '{slug}' não encontrado.")


def send_requester_email(access_request_id):
    """Imported by tests as a mock target; actual task defined in tasks.py."""
    from .tasks import send_requester_email as _task
    return _task


class AdminAccessRequestListView(APIView):
    authentication_classes = [KeycloakJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        ws = _get_workspace_or_404(slug)
        if request.user.workspace_id != ws.id or request.user.role != "admin":
            raise PermissionDenied()
        status_filter = request.query_params.get("status", "pending")
        qs = AccessRequest.objects.filter(workspace=ws)
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            AccessRequestDetailSerializer(page, many=True).data
        )


class AdminAccessRequestResolveView(APIView):
    authentication_classes = [KeycloakJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, slug, pk):
        ws = _get_workspace_or_404(slug)
        if request.user.workspace_id != ws.id or request.user.role != "admin":
            raise PermissionDenied()

        try:
            req = AccessRequest.objects.get(pk=pk, workspace=ws)
        except AccessRequest.DoesNotExist:
            raise NotFound()

        serializer = AdminResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            now = timezone.now()
            if data["action"] == "approve":
                workspace_ids = [ws.id] + list(data.get("extra_workspace_ids", []))
                for wid in workspace_ids:
                    target_ws = Workspace.objects.filter(pk=wid).first()
                    if not target_ws:
                        continue
                    WorkspaceMember.objects.get_or_create(
                        keycloak_sub=req.keycloak_sub,
                        workspace=target_ws,
                        defaults={
                            "email": req.email,
                            "name": req.name,
                            "role": data.get("role", "member"),
                        },
                    )
                req.status = AccessRequest.Status.APPROVED
                req.resolved_at = now
                req.resolved_by = request.user
                req.save(update_fields=["status", "resolved_at", "resolved_by"])

                from .tasks import send_requester_email as _email_task
                granted_names = list(
                    Workspace.objects.filter(pk__in=workspace_ids).values_list("name", flat=True)
                )
                _email_task.delay(
                    str(req.id), "approved",
                    extra={"workspace_names": granted_names},
                )

            else:  # deny
                req.status = AccessRequest.Status.DENIED
                req.denial_reason = data.get("denial_reason", "")
                req.resolved_at = now
                req.resolved_by = request.user
                req.save(update_fields=["status", "denial_reason", "resolved_at", "resolved_by"])

                from .tasks import send_requester_email as _email_task
                _email_task.delay(str(req.id), "denied")

        return Response(AccessRequestSerializer(req).data)
```

- [ ] **Step 4: Write `urls_workspace.py`**

```python
# backend/apps/access_requests/urls_workspace.py
from django.urls import path
from .views import AdminAccessRequestListView, AdminAccessRequestResolveView

urlpatterns = [
    path(
        "<slug:slug>/access-requests/",
        AdminAccessRequestListView.as_view(),
        name="workspace-access-request-list",
    ),
    path(
        "<slug:slug>/access-requests/<uuid:pk>/",
        AdminAccessRequestResolveView.as_view(),
        name="workspace-access-request-resolve",
    ),
]
```

- [ ] **Step 5: Wire workspace URLs**

In `backend/config/urls.py`, add after the existing workspaces include:

```python
path("api/v1/workspaces/", include("apps.access_requests.urls_workspace")),
```

Note: this second include for `api/v1/workspaces/` is valid — Django merges them.

- [ ] **Step 6: Run admin view tests**

```bash
cd backend
python manage.py test apps.access_requests.tests.test_views.AdminListViewTests apps.access_requests.tests.test_views.AdminResolveViewTests -v 2
```

Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/access_requests/views.py backend/apps/access_requests/urls_workspace.py backend/config/urls.py
git commit -m "feat(access-requests): add admin list and resolve endpoints"
```

---

## Task 6: Email and notification tasks

**Files:**
- Create: `backend/apps/access_requests/tasks.py`
- Modify: `backend/apps/notifications/models.py` (add ACCESS_REQUEST type)
- Modify: `backend/config/settings/base.py` (add Celery route)

- [ ] **Step 1: Add ACCESS_REQUEST notification type**

In `backend/apps/notifications/models.py`, inside `class Type(models.TextChoices)`, add:

```python
ACCESS_REQUEST = "access_request", "Solicitação de acesso"
```

- [ ] **Step 2: Write tasks**

```python
# backend/apps/access_requests/tasks.py
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_admin_notification(self, access_request_id: str, admin_member_id: str):
    """Create in-app notification for one workspace admin."""
    try:
        from apps.access_requests.models import AccessRequest
        from apps.notifications.tasks import create_notification

        req = AccessRequest.objects.select_related("workspace").get(pk=access_request_id)
        action_url = f"/settings/workspace?tab=requests"
        create_notification.delay(
            recipient_id=admin_member_id,
            notification_type="access_request",
            entity_type="access_request",
            entity_id=access_request_id,
            title=f"Nova solicitação de acesso — {req.name}",
            message=(
                f"{req.name} ({req.email}) solicitou acesso ao workspace "
                f"'{req.workspace_name}'. Secretaria: {req.secretaria}."
            ),
            action_url=action_url,
        )
    except Exception as exc:
        logger.exception("Erro ao notificar admin %s", admin_member_id)
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_requester_email(self, access_request_id: str, outcome: str, extra: dict = None):
    """
    Send email to the requester on approval or denial.
    outcome: 'approved' | 'denied'
    extra (approved): {'workspace_names': [...]}
    """
    try:
        from apps.access_requests.models import AccessRequest
        req = AccessRequest.objects.get(pk=access_request_id)

        if outcome == "approved":
            workspace_names = (extra or {}).get("workspace_names", [req.workspace_name])
            subject = f"Acesso aprovado — {', '.join(workspace_names)}"
            message = (
                f"Olá {req.name},\n\n"
                f"Sua solicitação de acesso foi aprovada!\n"
                f"Você agora tem acesso aos seguintes workspaces: {', '.join(workspace_names)}.\n\n"
                f"Faça login em {settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'o sistema'} para começar.\n\n"
                f"Equipe ProjectHub"
            )
        else:
            reason = req.denial_reason or "Entre em contato com o administrador para mais informações."
            subject = "Solicitação de acesso negada"
            message = (
                f"Olá {req.name},\n\n"
                f"Sua solicitação de acesso foi negada.\n\n"
                f"Motivo: {reason}\n\n"
                f"Você pode solicitar acesso novamente ou entrar em contato com o administrador.\n\n"
                f"Equipe ProjectHub"
            )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.email],
            fail_silently=False,
        )
        logger.info("E-mail de acesso (%s) enviado para %s", outcome, req.email)

    except Exception as exc:
        logger.exception("Erro ao enviar e-mail de acesso para request %s", access_request_id)
        raise self.retry(exc=exc, countdown=120)
```

- [ ] **Step 3: Add Celery task route**

In `backend/config/settings/base.py`, find the `CELERY_TASK_ROUTES` dict and add:

```python
"apps.access_requests.tasks.*": {"queue": "notifications"},
```

- [ ] **Step 4: Run all access_requests tests to confirm nothing broke**

```bash
cd backend
python manage.py test apps.access_requests -v 2
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/access_requests/tasks.py backend/apps/notifications/models.py backend/config/settings/base.py
git commit -m "feat(access-requests): add email/notification tasks and ACCESS_REQUEST type"
```

---

## Task 7: Frontend types, service, and hook

**Files:**
- Create: `frontend/src/types/accessRequest.ts`
- Create: `frontend/src/services/accessRequest.service.ts`
- Create: `frontend/src/hooks/useAccessRequest.ts`

- [ ] **Step 1: Write TypeScript types**

```typescript
// frontend/src/types/accessRequest.ts
export type AccessRequestStatus = 'pending' | 'approved' | 'denied'

export interface AccessRequest {
  id: string
  status: AccessRequestStatus
  workspaceName: string
  denialReason: string
  requestedAt: string
  resolvedAt: string | null
}

export interface AccessRequestDetail extends AccessRequest {
  keycloakSub: string
  email: string
  name: string
  workspace: string | null
  secretaria: string
  reason: string
  resolvedBy: string | null
  previousDenialCount: number
}

export interface AdminResolvePayload {
  action: 'approve' | 'deny'
  extraWorkspaceIds?: string[]
  denialReason?: string
  role?: 'admin' | 'member' | 'guest'
}
```

- [ ] **Step 2: Write service**

```typescript
// frontend/src/services/accessRequest.service.ts
import api from '@/lib/axios'
import type { AccessRequest, AccessRequestDetail, AdminResolvePayload } from '@/types/accessRequest'
import type { PaginatedResponse } from '@/types'

export const accessRequestService = {
  submit: (data: {
    workspaceId?: string
    workspaceName: string
    secretaria: string
    reason?: string
  }) =>
    api
      .post<AccessRequest>('/auth/access-requests/', {
        workspace_id: data.workspaceId,
        workspace_name: data.workspaceName,
        secretaria: data.secretaria,
        reason: data.reason ?? '',
      })
      .then((r) => r.data),

  getMyStatus: () =>
    api.get<AccessRequest>('/auth/access-requests/me/').then((r) => r.data),

  listForWorkspace: (slug: string, status = 'pending') =>
    api
      .get<PaginatedResponse<AccessRequestDetail>>(
        `/workspaces/${slug}/access-requests/`,
        { params: { status } },
      )
      .then((r) => r.data),

  resolve: (slug: string, requestId: string, payload: AdminResolvePayload) =>
    api
      .patch<AccessRequest>(`/workspaces/${slug}/access-requests/${requestId}/`, {
        action: payload.action,
        extra_workspace_ids: payload.extraWorkspaceIds ?? [],
        denial_reason: payload.denialReason ?? '',
        role: payload.role ?? 'member',
      })
      .then((r) => r.data),
}
```

- [ ] **Step 3: Write TanStack Query hook**

```typescript
// frontend/src/hooks/useAccessRequest.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessRequestService } from '@/services/accessRequest.service'
import type { AdminResolvePayload } from '@/types/accessRequest'

export function useMyAccessRequest() {
  return useQuery({
    queryKey: ['access-request-me'],
    queryFn: () => accessRequestService.getMyStatus(),
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 — means no request exists
      if ((error as { response?: { status?: number } })?.response?.status === 404) return false
      return failureCount < 2
    },
    staleTime: 0,
  })
}

export function useSubmitAccessRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accessRequestService.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['access-request-me'] }),
  })
}

export function useWorkspaceAccessRequests(slug: string, status = 'pending') {
  return useQuery({
    queryKey: ['workspace-access-requests', slug, status],
    queryFn: () => accessRequestService.listForWorkspace(slug, status),
    enabled: !!slug,
  })
}

export function useResolveAccessRequest(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: AdminResolvePayload }) =>
      accessRequestService.resolve(slug, requestId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-access-requests', slug] })
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/types/accessRequest.ts src/services/accessRequest.service.ts src/hooks/useAccessRequest.ts
git commit -m "feat(access-requests): add frontend types, service, and query hooks"
```

---

## Task 8: RequestAccessPage

**Files:**
- Create: `frontend/src/features/auth/RequestAccessPage.tsx`

- [ ] **Step 1: Write the page**

```tsx
// frontend/src/features/auth/RequestAccessPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { workspaceService } from '@/services/workspace.service'
import { useMyAccessRequest, useSubmitAccessRequest } from '@/hooks/useAccessRequest'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { AccessRequest } from '@/types/accessRequest'

// ─── Workspace autocomplete ───────────────────────────────────────────────────

function WorkspaceAutocomplete({
  value,
  onChange,
  suggestions,
  disabled,
}: {
  value: string
  onChange: (val: string, id?: string) => void
  suggestions: { id: string; name: string }[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filtered = suggestions.filter((s) =>
    s.name.toLowerCase().includes(value.toLowerCase()),
  )

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Nome do workspace ou secretaria"
        aria-autocomplete="list"
        aria-label="Workspace"
        className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm"
        >
          {filtered.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={value === s.name}
              onMouseDown={() => onChange(s.name, s.id)}
              className="cursor-pointer px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Pending screen ───────────────────────────────────────────────────────────

function PendingScreen({ req }: { req: AccessRequest }) {
  const navigate = useNavigate()
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const user = useAuthStore((s) => s.user)
  const polled = useRef(false)

  useEffect(() => {
    const id = setInterval(async () => {
      if (polled.current) return
      try {
        const { accessRequestService } = await import('@/services/accessRequest.service')
        const latest = await accessRequestService.getMyStatus()
        if (latest.status === 'approved') {
          polled.current = true
          clearInterval(id)
          const workspaces = await workspaceService.list()
          if (workspaces.length > 0) {
            setWorkspace(workspaces[0])
            navigate('/', { replace: true })
          }
        } else if (latest.status === 'denied') {
          polled.current = true
          clearInterval(id)
          navigate('/request-access', { replace: true, state: { denied: latest } })
        }
      } catch {}
    }, 30_000)
    return () => clearInterval(id)
  }, [navigate, setWorkspace])

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Solicitação enviada</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Sua solicitação para <strong>{req.workspaceName}</strong> está aguardando aprovação.
        Enviaremos uma notificação para <strong>{user?.email}</strong>.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Enviada em {new Date(req.requestedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function RequestForm({
  deniedReq,
  workspaceSuggestions,
}: {
  deniedReq?: AccessRequest | null
  workspaceSuggestions: { id: string; name: string }[]
}) {
  const user = useAuthStore((s) => s.user)
  const submit = useSubmitAccessRequest()
  const [workspaceName, setWorkspaceName] = useState(deniedReq?.workspaceName ?? '')
  const [workspaceId, setWorkspaceId] = useState<string | undefined>()
  const [secretaria, setSecretaria] = useState('')
  const [reason, setReason] = useState('')

  function handleWorkspaceChange(name: string, id?: string) {
    setWorkspaceName(name)
    setWorkspaceId(id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit.mutate({ workspaceId, workspaceName, secretaria, reason })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {deniedReq && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {deniedReq.denialReason
            ? `Solicitação anterior negada: ${deniedReq.denialReason}`
            : 'Sua solicitação anterior foi negada. Você pode tentar novamente.'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="req-name">
            Nome
          </label>
          <input
            id="req-name"
            value={user?.name ?? ''}
            readOnly
            aria-readonly="true"
            className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="req-email">
            E-mail
          </label>
          <input
            id="req-email"
            value={user?.email ?? ''}
            readOnly
            aria-readonly="true"
            className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="req-workspace">
          Workspace <span aria-hidden="true">*</span>
        </label>
        <WorkspaceAutocomplete
          value={workspaceName}
          onChange={handleWorkspaceChange}
          suggestions={workspaceSuggestions}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="req-secretaria">
          Secretaria / Área <span aria-hidden="true">*</span>
        </label>
        <input
          id="req-secretaria"
          value={secretaria}
          onChange={(e) => setSecretaria(e.target.value.slice(0, 120))}
          required
          maxLength={120}
          placeholder="ex: Secretaria de Tecnologia"
          className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="req-reason">
          Motivo (opcional)
        </label>
        <textarea
          id="req-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Descreva brevemente por que precisa de acesso…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={!workspaceName.trim() || !secretaria.trim() || submit.isPending}
        className="w-full"
      >
        {submit.isPending ? 'Enviando…' : 'Solicitar acesso'}
      </Button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RequestAccessPage() {
  const { data: currentReq, isLoading } = useMyAccessRequest()
  const [workspaceSuggestions, setWorkspaceSuggestions] = useState<{ id: string; name: string }[]>([])

  const locationState = (window.history.state as { usr?: { denied?: AccessRequest } })?.usr
  const deniedFromNav = locationState?.denied ?? null

  useEffect(() => {
    workspaceService.list().then((ws) =>
      setWorkspaceSuggestions(ws.map((w) => ({ id: w.id, name: w.name }))),
    ).catch(() => {})
  }, [])

  const isPending = currentReq?.status === 'pending'
  const isDenied  = !isPending && (currentReq?.status === 'denied' || !!deniedFromNav)
  const deniedReq = isDenied ? (currentReq ?? deniedFromNav) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isPending ? 'Aguardando aprovação' : 'Solicitar acesso'}
          </h1>
          {!isPending && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preencha o formulário e um administrador revisará sua solicitação.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Carregando…</div>
          ) : isPending ? (
            <PendingScreen req={currentReq!} />
          ) : (
            <RequestForm deniedReq={deniedReq} workspaceSuggestions={workspaceSuggestions} />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/features/auth/RequestAccessPage.tsx
git commit -m "feat(access-requests): add RequestAccessPage with form/pending/denial states"
```

---

## Task 9: AuthProvider and App.tsx changes

**Files:**
- Modify: `frontend/src/features/auth/AuthProvider.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update `AuthProvider.tsx`**

Replace the current `no workspaces → navigate('/onboarding')` block with an access-request status check. Open `frontend/src/features/auth/AuthProvider.tsx` and replace the `if (workspaces.length > 0)` block (lines 42-46):

```tsx
// Old code (lines 42-46):
//   if (workspaces.length > 0) {
//     setWorkspace(workspaces[0])
//   } else {
//     navigate('/onboarding', { replace: true })
//   }

// New code:
if (workspaces.length > 0) {
  setWorkspace(workspaces[0])
} else {
  // New user with no workspace membership — check for an existing request
  try {
    const { accessRequestService } = await import('@/services/accessRequest.service')
    await accessRequestService.getMyStatus()
    // Request exists (pending or denied) — go to request-access page
  } catch {
    // 404 = no request yet — also go to request-access page
  }
  navigate('/request-access', { replace: true })
}
```

Also replace the catch block's `navigate('/onboarding', ...)` (line 53) with:

```tsx
if (!cancelled) navigate('/request-access', { replace: true })
```

- [ ] **Step 2: Add `/request-access` route in `App.tsx`**

In `frontend/src/App.tsx`, after the existing `<Route path="/onboarding" ... />`, add:

```tsx
import { RequestAccessPage } from './features/auth/RequestAccessPage'

// inside <Routes>:
<Route path="/request-access" element={<RequestAccessPage />} />
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/auth/AuthProvider.tsx src/App.tsx
git commit -m "feat(access-requests): redirect new users to request-access instead of onboarding"
```

---

## Task 10: Admin AccessRequestsTab

**Files:**
- Create: `frontend/src/features/workspace/AccessRequestsTab.tsx`

- [ ] **Step 1: Write the admin tab**

```tsx
// frontend/src/features/workspace/AccessRequestsTab.tsx
import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useWorkspaceAccessRequests, useResolveAccessRequest } from '@/hooks/useAccessRequest'
import { useWorkspaceList } from '@/hooks/useWorkspace'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { AccessRequestDetail } from '@/types/accessRequest'

function RequestRow({
  req,
  workspaceSlug,
}: {
  req: AccessRequestDetail
  workspaceSlug: string
}) {
  const resolve = useResolveAccessRequest(workspaceSlug)
  const { data: allWorkspaces = [] } = useWorkspaceList()
  const [denying, setDenying] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    req.workspace ? [req.workspace] : [],
  )
  const [role, setRole] = useState<'admin' | 'member' | 'guest'>('member')

  function toggleWorkspace(id: string) {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    )
  }

  function handleApprove() {
    const [primary, ...extras] = selectedWorkspaceIds
    if (!primary) return
    resolve.mutate({
      requestId: req.id,
      payload: { action: 'approve', extraWorkspaceIds: extras, role },
    })
  }

  function handleDenyConfirm() {
    if (!denialReason.trim()) return
    resolve.mutate({
      requestId: req.id,
      payload: { action: 'deny', denialReason },
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      {/* Requester info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{req.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {req.secretaria}
            {req.previousDenialCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                {req.previousDenialCount}× negado antes
              </span>
            )}
          </p>
          {req.reason && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
              "{req.reason}"
            </p>
          )}
          <p className="mt-1 text-[11px] text-gray-400">
            {new Date(req.requestedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          → {req.workspaceName}
        </span>
      </div>

      {/* Action controls */}
      {!denying ? (
        <div className="flex flex-col gap-2">
          {/* Workspace multi-select */}
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Conceder acesso a:</p>
            <div className="flex flex-wrap gap-1.5">
              {allWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => toggleWorkspace(ws.id)}
                  aria-pressed={selectedWorkspaceIds.includes(ws.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    selectedWorkspaceIds.includes(ws.id)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
                  )}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>

          {/* Role selector */}
          <div className="flex items-center gap-2">
            <label htmlFor={`role-${req.id}`} className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Função:
            </label>
            <select
              id={`role-${req.id}`}
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
              <option value="guest">Convidado</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={selectedWorkspaceIds.length === 0 || resolve.isPending}
              className="flex-1"
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDenying(true)}
              disabled={resolve.isPending}
              className="flex-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Negar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`denial-${req.id}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Motivo da negação <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`denial-${req.id}`}
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            rows={2}
            placeholder="Explique o motivo…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleDenyConfirm}
              disabled={!denialReason.trim() || resolve.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar negação
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDenying(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AccessRequestsTab() {
  const { workspace } = useWorkspaceStore()
  const slug = workspace?.slug ?? ''
  const { data, isLoading } = useWorkspaceAccessRequests(slug, 'pending')
  const requests = data?.results ?? []

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">Carregando solicitações…</div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhuma solicitação pendente.
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="list"
      aria-label="Solicitações de acesso pendentes"
    >
      {requests.map((req) => (
        <div key={req.id} role="listitem">
          <RequestRow req={req} workspaceSlug={slug} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Check that `useWorkspaceList` exists in `@/hooks/useWorkspace`**

```bash
grep -n "useWorkspaceList\|export function use" frontend/src/hooks/useWorkspace.ts | head -10
```

If `useWorkspaceList` does not exist, add it to `frontend/src/hooks/useWorkspace.ts`:

```typescript
export function useWorkspaceList() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.list(),
  })
}
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/workspace/AccessRequestsTab.tsx src/hooks/useWorkspace.ts
git commit -m "feat(access-requests): add admin AccessRequestsTab"
```

---

## Task 11: Wire tab into WorkspaceSettings

**Files:**
- Modify: `frontend/src/features/workspace/WorkspaceSettings.tsx`

- [ ] **Step 1: Add "Solicitações" tab**

Open `frontend/src/features/workspace/WorkspaceSettings.tsx`. The file uses a tab-style layout. Add the import at the top:

```tsx
import { AccessRequestsTab } from './AccessRequestsTab'
import { useWorkspaceAccessRequests } from '@/hooks/useAccessRequest'
```

Find where the component renders its tab navigation. Add a "Solicitações" tab entry alongside the existing ones. The tab should show a badge if there are pending requests.

Inside the component, add:

```tsx
const { workspace } = useWorkspaceStore()
const { data: pendingRequests } = useWorkspaceAccessRequests(workspace?.slug ?? '', 'pending')
const pendingCount = pendingRequests?.results?.length ?? 0
```

Add the tab button (adjust className to match the existing tab button style in the file):

```tsx
<button
  onClick={() => setActiveTab('requests')}
  className={cn(/* same classes as other tab buttons */,
    activeTab === 'requests' ? /* active classes */ : /* inactive classes */
  )}
  aria-selected={activeTab === 'requests'}
>
  Solicitações
  {pendingCount > 0 && (
    <span
      aria-label={`${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
    >
      {pendingCount}
    </span>
  )}
</button>
```

And in the tab content area, add:

```tsx
{activeTab === 'requests' && <AccessRequestsTab />}
```

**Note:** Open the file first (`Read frontend/src/features/workspace/WorkspaceSettings.tsx`) to see the exact tab management pattern (it may use `useState` for `activeTab` or URL query params) and match it exactly.

- [ ] **Step 2: Verify the URL-based tab navigation**

The spec says admins are navigated to `/settings/workspace?tab=requests` from notifications. Check if `WorkspaceSettings` already reads `?tab=` from the URL; if not, add:

```tsx
const [searchParams] = useSearchParams()
const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'members')
```

Import `useSearchParams` from `react-router-dom` if not already imported.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/workspace/WorkspaceSettings.tsx
git commit -m "feat(access-requests): add Solicitações tab to WorkspaceSettings"
```

---

## Task 12: Frontend tests

**Files:**
- Create: `frontend/src/features/auth/RequestAccessPage.test.tsx`
- Create: `frontend/src/features/workspace/AccessRequestsTab.test.tsx`

- [ ] **Step 1: Write `RequestAccessPage` tests**

```tsx
// frontend/src/features/auth/RequestAccessPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RequestAccessPage } from './RequestAccessPage'

vi.mock('@/services/accessRequest.service', () => ({
  accessRequestService: {
    getMyStatus: vi.fn(),
    submit: vi.fn(),
  },
}))
vi.mock('@/services/workspace.service', () => ({
  workspaceService: { list: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ user: { name: 'Test User', email: 'user@test.com' } }),
  ),
}))
vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn((selector) => selector({ setWorkspace: vi.fn() })),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RequestAccessPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders form when no prior request (404)', async () => {
    const { accessRequestService } = await import('@/services/accessRequest.service')
    vi.mocked(accessRequestService.getMyStatus).mockRejectedValue({ response: { status: 404 } })

    render(<RequestAccessPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/secretaria/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /solicitar acesso/i })).toBeInTheDocument()
  })

  it('shows pending state when request is pending', async () => {
    const { accessRequestService } = await import('@/services/accessRequest.service')
    vi.mocked(accessRequestService.getMyStatus).mockResolvedValue({
      id: '1',
      status: 'pending',
      workspaceName: 'TI',
      denialReason: '',
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
    })

    render(<RequestAccessPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
    expect(screen.getByText(/aguardando aprovação/i)).toBeInTheDocument()
  })

  it('shows denial banner when request was denied', async () => {
    const { accessRequestService } = await import('@/services/accessRequest.service')
    vi.mocked(accessRequestService.getMyStatus).mockResolvedValue({
      id: '1',
      status: 'denied',
      workspaceName: 'TI',
      denialReason: 'Sem vagas no momento.',
      requestedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    })

    render(<RequestAccessPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/sem vagas no momento/i)).toBeInTheDocument()
  })

  it('submit button is disabled when required fields are empty', async () => {
    const { accessRequestService } = await import('@/services/accessRequest.service')
    vi.mocked(accessRequestService.getMyStatus).mockRejectedValue({ response: { status: 404 } })

    render(<RequestAccessPage />, { wrapper })

    await waitFor(() => screen.getByRole('button', { name: /solicitar acesso/i }))
    expect(screen.getByRole('button', { name: /solicitar acesso/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Write `AccessRequestsTab` tests**

```tsx
// frontend/src/features/workspace/AccessRequestsTab.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AccessRequestsTab } from './AccessRequestsTab'

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn((selector) =>
    selector({ workspace: { id: 'ws1', slug: 'test-ws', name: 'Test WS' } }),
  ),
}))
vi.mock('@/hooks/useAccessRequest', () => ({
  useWorkspaceAccessRequests: vi.fn(),
  useResolveAccessRequest: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))
vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspaceList: vi.fn(() => ({
    data: [{ id: 'ws1', name: 'Test WS' }],
  })),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AccessRequestsTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows empty state when no pending requests', async () => {
    const { useWorkspaceAccessRequests } = await import('@/hooks/useAccessRequest')
    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: { results: [], count: 0 },
      isLoading: false,
    } as ReturnType<typeof useWorkspaceAccessRequests>)

    render(<AccessRequestsTab />, { wrapper })

    expect(screen.getByText(/nenhuma solicitação pendente/i)).toBeInTheDocument()
  })

  it('renders request list with requester info', async () => {
    const { useWorkspaceAccessRequests } = await import('@/hooks/useAccessRequest')
    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: {
        results: [{
          id: 'req1', keycloakSub: 'sub1', email: 'user@test.com',
          name: 'Test User', workspace: 'ws1', workspaceName: 'Test WS',
          secretaria: 'TI', reason: '', status: 'pending',
          denialReason: '', requestedAt: new Date().toISOString(),
          resolvedAt: null, resolvedBy: null, previousDenialCount: 0,
        }],
        count: 1,
      },
      isLoading: false,
    } as ReturnType<typeof useWorkspaceAccessRequests>)

    render(<AccessRequestsTab />, { wrapper })

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('deny button requires non-empty reason before confirm is enabled', async () => {
    const { useWorkspaceAccessRequests } = await import('@/hooks/useAccessRequest')
    vi.mocked(useWorkspaceAccessRequests).mockReturnValue({
      data: {
        results: [{
          id: 'req1', keycloakSub: 'sub1', email: 'user@test.com',
          name: 'Test User', workspace: 'ws1', workspaceName: 'Test WS',
          secretaria: 'TI', reason: '', status: 'pending',
          denialReason: '', requestedAt: new Date().toISOString(),
          resolvedAt: null, resolvedBy: null, previousDenialCount: 0,
        }],
        count: 1,
      },
      isLoading: false,
    } as ReturnType<typeof useWorkspaceAccessRequests>)

    render(<AccessRequestsTab />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /negar/i }))
    expect(screen.getByRole('button', { name: /confirmar negação/i })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText(/explique o motivo/i), 'Sem vagas')
    expect(screen.getByRole('button', { name: /confirmar negação/i })).toBeEnabled()
  })
})
```

- [ ] **Step 3: Run frontend tests**

```bash
cd frontend
npm run test -- --run src/features/auth/RequestAccessPage.test.tsx src/features/workspace/AccessRequestsTab.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
cd frontend
npm run test -- --run
```

Expected: no new failures.

- [ ] **Step 5: Run backend tests**

```bash
cd backend
python manage.py test apps.access_requests -v 2
```

Expected: all tests pass.

- [ ] **Step 6: Typecheck**

```bash
cd frontend
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Update CHANGELOG**

Add to `CHANGELOG.md` under `[Unreleased]`:

```markdown
### Added
- Access Request Flow: new users arriving via any Keycloak provider see a "Request Access" form instead of the create-workspace wizard
- Admins receive in-app notifications and can approve/deny requests from a new "Solicitações" tab in workspace settings
- Approval creates WorkspaceMember records for the requested workspace plus any extras chosen by the admin
- Email notifications sent to requesters on approval and denial via Celery
- Denied users can re-request with admin's denial reason shown as a banner
```

- [ ] **Step 8: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for access-request flow"
```
