"""
Tarefas Celery para o módulo de notificações.

- create_notification: cria Notification no banco e emite via WebSocket
- send_email_notification: envia e-mail ao destinatário (opcional, configurável)
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="notifications")
def create_notification(
    self,
    recipient_id: str,
    notification_type: str,
    entity_type: str,
    entity_id: str,
    title: str,
    message: str = "",
    action_url: str = "",
    actor_id: str = None,
):
    """
    Cria uma Notification persistida e envia via WebSocket ao destinatário.

    Parâmetros são todos serializáveis (str/UUID as str) para o broker Celery.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from apps.notifications.models import Notification
        from apps.workspaces.models import WorkspaceMember

        recipient = WorkspaceMember.objects.get(pk=recipient_id)
        actor = WorkspaceMember.objects.get(pk=actor_id) if actor_id else None

        notification = Notification.objects.create(
            recipient=recipient,
            actor=actor,
            type=notification_type,
            entity_type=entity_type,
            entity_id=entity_id,
            title=title,
            message=message,
            action_url=action_url,
        )

        # Emite via WebSocket para o grupo do usuário
        channel_layer = get_channel_layer()
        if channel_layer:
            from apps.notifications.serializers import NotificationSerializer

            payload = {
                "type": "notification_new",
                "notification": NotificationSerializer(notification).data,
            }
            async_to_sync(channel_layer.group_send)(
                f"user_{recipient_id}", payload
            )

        logger.info(
            "Notificação criada: type=%s recipient=%s", notification_type, recipient_id
        )
        return str(notification.pk)

    except Exception as exc:
        logger.exception("Erro ao criar notificação para recipient %s", recipient_id)
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_email_notification(self, notification_id: str):
    """
    Envia e-mail de notificação ao destinatário.

    Só executa se NOTIFICATIONS_EMAIL_ENABLED=True nas settings.
    """
    try:
        from django.conf import settings
        from django.core.mail import send_mail

        if not getattr(settings, "NOTIFICATIONS_EMAIL_ENABLED", False):
            return

        from apps.notifications.models import Notification

        notification = Notification.objects.select_related("recipient").get(pk=notification_id)
        email = getattr(notification.recipient, "email", None)
        if not email:
            return

        send_mail(
            subject=notification.title,
            message=notification.message or notification.title,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info("E-mail enviado para %s (notification %s)", email, notification_id)

    except Exception as exc:
        logger.exception("Erro ao enviar e-mail para notification %s", notification_id)
        raise self.retry(exc=exc, countdown=120)
