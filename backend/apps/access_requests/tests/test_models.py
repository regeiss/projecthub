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
        self.assertEqual(denied.status, AccessRequest.Status.DENIED)

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
