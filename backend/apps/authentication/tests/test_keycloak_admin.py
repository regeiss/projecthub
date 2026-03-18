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
