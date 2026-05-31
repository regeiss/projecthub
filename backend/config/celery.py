import os

from celery import Celery
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("projecthub")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Filas explícitas além da default
app.conf.task_queues = {
    "default":       {"exchange": "default"},
    "cpm":           {"exchange": "cpm"},
    "notifications": {"exchange": "notifications"},
    "sync":          {"exchange": "sync"},
}
app.conf.task_default_queue = "default"
app.conf.broker_connection_retry_on_startup = True

# Celery Beat — tarefas periódicas
app.conf.beat_schedule = {
    "refresh-portfolio-rag-hourly": {
        "task": "apps.portfolio.tasks.refresh_all_portfolio_rag",
        "schedule": 3600,  # a cada hora (segundos)
    },
}
