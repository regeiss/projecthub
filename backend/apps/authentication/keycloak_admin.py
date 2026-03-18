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
      user_realm_name=getattr(settings, "KEYCLOAK_ADMIN_REALM", "master"),
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
