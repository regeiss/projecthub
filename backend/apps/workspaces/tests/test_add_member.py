import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.workspaces.serializers import WorkspaceMemberCreateSerializer


def make_workspace():
  return Workspace.objects.create(name="Test", slug="test")


def make_member(workspace, role="admin", sub=None):
  return WorkspaceMember.objects.create(
    workspace=workspace,
    keycloak_sub=sub or str(uuid.uuid4()),
    email="admin@test.com",
    name="Admin",
    role=role,
  )


# ---------------------------------------------------------------------------
# Serializer tests
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# View tests — search
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# View tests — create member
# ---------------------------------------------------------------------------

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
    self.assertEqual(resp.status_code, 201, resp.data)

    auth = KeycloakJWTAuthentication()
    payload_jwt = {
      "sub": "new-admin-sub",
      "email": "na@test.com",
      "name": "NA",
      "preferred_username": "na",
    }
    member = auth._get_or_create_member(payload_jwt)
    self.assertEqual(member.role, "admin")
