from django.apps import AppConfig


class IssuesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.issues"

    def ready(self):
        import apps.issues.signals  # noqa: F401
