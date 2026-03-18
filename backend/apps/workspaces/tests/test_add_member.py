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
