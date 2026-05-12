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
            server_url=settings.KEYCLOAK_SERVER_URL.rstrip("/") + "/",
            realm_name=settings.KEYCLOAK_REALM,
            username=settings.KEYCLOAK_ADMIN,
            password=settings.KEYCLOAK_ADMIN_PASSWORD,
            verify=True,
        )
        results = admin.get_users({"search": query, "max": 20})
        users = []
        for u in results:
            first = (u.get("firstName") or "").strip()
            last = (u.get("lastName") or "").strip()
            full_name = f"{first} {last}".strip() or u.get("username", "")
            users.append({"sub": u.get("id", ""), "email": u.get("email", ""), "name": full_name})
        return users
    except KeycloakAdminUnavailable:
        raise
    except Exception as exc:
        raise KeycloakAdminUnavailable(str(exc)) from exc
