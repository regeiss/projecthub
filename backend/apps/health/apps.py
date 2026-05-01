"""
App configuration for custom health checks.
"""

from django.apps import AppConfig


class HealthConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.health"
    verbose_name = "Health Checks"

    def ready(self):
        """Register custom health checks when the app is ready."""
        from . import checks  # noqa: F401
