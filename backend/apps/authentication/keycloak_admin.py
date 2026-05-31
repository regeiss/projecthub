import logging

from django.conf import settings
from keycloak import KeycloakAdmin, KeycloakOpenIDConnection

logger = logging.getLogger(__name__)


class KeycloakAdminUnavailable(Exception):
    """Raised when the Keycloak Admin API is unreachable or auth fails."""


def search_users(query: str) -> list[dict]:
    """Search Keycloak users by query string, including LDAP-federated users.

    Returns up to 20 results as [{ sub, email, name }].
    Raises KeycloakAdminUnavailable on any Keycloak error.
    """
    try:
        # python-keycloak 4+ requires KeycloakOpenIDConnection.
        # Admin user lives in KEYCLOAK_ADMIN_REALM (default: master);
        # we then switch realm_name to operate on the application realm.
        connection = KeycloakOpenIDConnection(
            server_url=settings.KEYCLOAK_SERVER_URL.rstrip("/") + "/",
            realm_name=settings.KEYCLOAK_ADMIN_REALM,
            username=settings.KEYCLOAK_ADMIN,
            password=settings.KEYCLOAK_ADMIN_PASSWORD,
            verify=True,
        )
        admin = KeycloakAdmin(connection=connection)
        admin.realm_name = settings.KEYCLOAK_REALM
        # briefRepresentation must be the string "false" — Keycloak expects
        # lowercase booleans and requests would serialize False as "False".
        results = admin.get_users({"search": query, "max": 20, "briefRepresentation": "false"})
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
        logger.exception("Keycloak admin search failed: %s", exc)
        raise KeycloakAdminUnavailable(str(exc)) from exc
