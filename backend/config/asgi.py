# =============================================================================
# ProjectHub — config/asgi.py
# ASGI config com Django Channels para WebSocket
# =============================================================================

import os
from urllib.parse import urlparse

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# Inicializa o Django antes de importar os consumers
django_asgi_app = get_asgi_application()

from django.conf import settings  # noqa: E402
from core.websocket.middleware import KeycloakAuthMiddleware  # noqa: E402
from core.websocket.routing import websocket_urlpatterns       # noqa: E402


class CorsOriginValidator:
    """Accepts WebSocket connections from ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS."""

    def __init__(self, application):
        self.application = application

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            origin = dict(scope.get("headers", [])).get(b"origin", b"").decode()
            if origin and not self._is_allowed(origin):
                await send({"type": "websocket.close", "code": 403})
                return
        await self.application(scope, receive, send)

    def _is_allowed(self, origin: str) -> bool:
        # Allow origins explicitly listed in CORS settings
        cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        if origin in cors_origins:
            return True
        # Allow bare hostnames from ALLOWED_HOSTS (any scheme/port)
        parsed = urlparse(origin)
        hostname = parsed.hostname or ""
        return hostname in settings.ALLOWED_HOSTS


application = ProtocolTypeRouter({
    # Requisições HTTP normais
    "http": django_asgi_app,

    # WebSocket — autenticado via token Keycloak
    "websocket": CorsOriginValidator(
        KeycloakAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
