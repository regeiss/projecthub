from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


class KeycloakAuthMiddleware(BaseMiddleware):
    """
    Autentica conexões WebSocket via token Keycloak no query string.
    Uso: wss://host/ws/.../?token=<access_token>
    Rejeita com código 4001 se token inválido ou ausente.
    """

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            scope["user"] = await _resolve_user(scope)
        return await super().__call__(scope, receive, send)


@sync_to_async(thread_sensitive=False)
def _resolve_user(scope):
    from apps.authentication.authentication import KeycloakJWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    query_string = scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    token = params.get("token", [None])[0]

    if not token:
        return AnonymousUser()

    auth = KeycloakJWTAuthentication()
    try:
        return auth._decode_and_get_member(token)
    except (AuthenticationFailed, Exception):
        return AnonymousUser()
