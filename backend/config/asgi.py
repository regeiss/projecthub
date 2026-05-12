# =============================================================================
# ProjectHub — config/asgi.py
# ASGI config com Django Channels para WebSocket
# =============================================================================

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# Inicializa o Django antes de importar os consumers
django_asgi_app = get_asgi_application()

from core.websocket.middleware import KeycloakAuthMiddleware  # noqa: E402
from core.websocket.routing import websocket_urlpatterns       # noqa: E402

# AllowedHostsOriginValidator is omitted: WS connections are already protected
# by the Keycloak JWT token in the query string, which prevents cross-site abuse.
application = ProtocolTypeRouter({
    # Requisições HTTP normais
    "http": django_asgi_app,

    # WebSocket — autenticado via token Keycloak
    "websocket": KeycloakAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
