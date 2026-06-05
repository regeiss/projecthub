import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_admin_notification(self, access_request_id: str, admin_member_id: str):
    try:
        from apps.access_requests.models import AccessRequest
        from apps.notifications.tasks import create_notification

        req = AccessRequest.objects.select_related("workspace").get(pk=access_request_id)
        create_notification.delay(
            recipient_id=admin_member_id,
            notification_type="access_request",
            entity_type="access_request",
            entity_id=access_request_id,
            title=f"Nova solicitação de acesso — {req.name}",
            message=(
                f"{req.name} ({req.email}) solicitou acesso ao workspace "
                f"'{req.workspace_name}'. Secretaria: {req.secretaria}."
            ),
            action_url="/settings/workspace?tab=requests",
        )
    except Exception as exc:
        logger.exception("Erro ao notificar admin %s", admin_member_id)
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, queue="notifications")
def send_requester_email(self, access_request_id: str, outcome: str, extra: dict = None):
    try:
        from apps.access_requests.models import AccessRequest

        req = AccessRequest.objects.get(pk=access_request_id)

        if outcome == "approved":
            workspace_names = (extra or {}).get("workspace_names", [req.workspace_name])
            subject = f"Acesso aprovado — {', '.join(workspace_names)}"
            message = (
                f"Olá {req.name},\n\n"
                f"Sua solicitação de acesso foi aprovada!\n"
                f"Você agora tem acesso aos seguintes workspaces: {', '.join(workspace_names)}.\n\n"
                f"Equipe ProjectHub"
            )
        else:
            reason = req.denial_reason or "Entre em contato com o administrador para mais informações."
            subject = "Solicitação de acesso negada"
            message = (
                f"Olá {req.name},\n\n"
                f"Sua solicitação de acesso foi negada.\n\n"
                f"Motivo: {reason}\n\n"
                f"Você pode solicitar acesso novamente ou entrar em contato com o administrador.\n\n"
                f"Equipe ProjectHub"
            )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.email],
            fail_silently=False,
        )
        logger.info("E-mail de acesso (%s) enviado para %s", outcome, req.email)

    except Exception as exc:
        logger.exception("Erro ao enviar e-mail de acesso para request %s", access_request_id)
        raise self.retry(exc=exc, countdown=120)
