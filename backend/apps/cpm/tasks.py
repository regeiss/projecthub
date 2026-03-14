"""
Tasks Celery para o módulo CPM.

- recalculate_cpm: calcula o caminho crítico do projeto e persiste em cpm_issue_data.
  Disparado por:
  - Criação/remoção de IssueRelation do tipo CPM (via issues/signals.py)
  - Chamada manual via POST /api/v1/cpm/projects/{id}/calculate/
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="cpm")
def recalculate_cpm(self, project_id: str):
    """
    Recalcula o CPM de um projeto e:
    1. Persiste os resultados em CpmIssueData (bulk_update/create)
    2. Faz broadcast do resultado via WebSocket (grupo project_{project_id})
    3. Verifica alertas: issues críticas com due_date vencida → notificação
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from django.db import transaction

        from apps.cpm.algorithm import calcular_cpm
        from apps.cpm.models import CpmIssueData
        from apps.issues.models import Issue

        logger.info("Recalculando CPM para projeto %s", project_id)
        result = calcular_cpm(project_id)

        now = timezone.now()

        with transaction.atomic():
            existing = {
                str(d.issue_id): d
                for d in CpmIssueData.objects.filter(issue__project_id=project_id)
            }

            to_create = []
            to_update = []

            for issue_id, node_data in result["nodes"].items():
                if issue_id in existing:
                    obj = existing[issue_id]
                    obj.es = node_data["es"]
                    obj.ef = node_data["ef"]
                    obj.ls = node_data["ls"]
                    obj.lf = node_data["lf"]
                    obj.slack = node_data["slack"]
                    obj.is_critical = node_data["is_critical"]
                    obj.calculated_at = now
                    to_update.append(obj)
                else:
                    to_create.append(
                        CpmIssueData(
                            issue_id=issue_id,
                            duration_days=node_data["duration"],
                            es=node_data["es"],
                            ef=node_data["ef"],
                            ls=node_data["ls"],
                            lf=node_data["lf"],
                            slack=node_data["slack"],
                            is_critical=node_data["is_critical"],
                            calculated_at=now,
                        )
                    )

            if to_create:
                CpmIssueData.objects.bulk_create(to_create, ignore_conflicts=True)
            if to_update:
                CpmIssueData.objects.bulk_update(
                    to_update,
                    ["es", "ef", "ls", "lf", "slack", "is_critical", "calculated_at"],
                )

        # Broadcast via WebSocket
        channel_layer = get_channel_layer()
        if channel_layer:
            payload = {
                "type": "cpm_updated",
                "project_id": project_id,
                "project_duration": result["project_duration"],
                "critical_path": result["critical_path"],
            }
            async_to_sync(channel_layer.group_send)(f"project_{project_id}", payload)

        # Verifica alertas: issues críticas com due_date vencida
        _check_critical_alerts(project_id, result["critical_path"])

        logger.info(
            "CPM recalculado para projeto %s — duração=%d dias, caminho crítico=%d issues",
            project_id,
            result["project_duration"],
            len(result["critical_path"]),
        )
        return result

    except Exception as exc:
        logger.exception("Erro ao recalcular CPM para projeto %s", project_id)
        raise self.retry(exc=exc, countdown=60)


def _check_critical_alerts(project_id: str, critical_path: list):
    """Notifica membros quando uma issue crítica está com due_date vencida."""
    try:
        from django.utils import timezone

        from apps.issues.models import Issue
        from apps.notifications.tasks import create_notification

        today = timezone.now().date()
        overdue_critical = Issue.objects.filter(
            project_id=project_id,
            id__in=critical_path,
            due_date__lt=today,
        ).select_related("assignee", "created_by")

        for issue in overdue_critical:
            recipients = set()
            if issue.assignee:
                recipients.add(issue.assignee)
            if issue.created_by:
                recipients.add(issue.created_by)

            for member in recipients:
                create_notification.delay(
                    recipient_id=str(member.pk),
                    notification_type="cpm_critical_alert",
                    entity_type="issue",
                    entity_id=str(issue.pk),
                    title=f"Issue crítica atrasada: {issue.title}",
                    message=(
                        f"A issue #{issue.sequence_id} está no caminho crítico "
                        f"e venceu em {issue.due_date}."
                    ),
                    action_url=f"/projects/{issue.project_id}/issues/{issue.pk}/",
                )
    except Exception:
        logger.exception("Erro ao verificar alertas CPM para projeto %s", project_id)
