# =============================================================================
# ProjectHub — config/settings/development.py
# Overrides para desenvolvimento local
# =============================================================================

from .base import *  # noqa

DEBUG = True

KEYCLOAK_VERIFY_ISSUER = False   # issuer differs: browser uses 127.0.0.1, Docker uses keycloak
KEYCLOAK_VERIFY_AUDIENCE = False  # aud is projecthub-frontend; backend client is projecthub-backend

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use in-memory channel layer for tests (no Redis required)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
