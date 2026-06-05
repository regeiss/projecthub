import uuid
from unittest.mock import patch
from django.test import TestCase

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
