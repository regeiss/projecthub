# Garante que o app Celery é carregado quando Django inicializa
from .celery import app as celery_app

__all__ = ("celery_app",)
