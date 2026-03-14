import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Issue, IssueActivity, IssueRelation

logger = logging.getLogger(__name__)

# Campos monitorados para IssueActivity
_TRACKED_FIELDS = [
    ("state_id", "updated_state"),
    ("assignee_id", "assigned"),
    ("priority", "updated_priority"),
    ("type", "updated_type"),
    ("title", "updated_title"),
    ("start_date", "updated_start_date"),
    ("due_date", "updated_due_date"),
    ("estimate_points", "updated_estimate_points"),
    ("parent_id", "updated_parent"),
]


@receiver(pre_save, sender=Issue)
def capture_issue_changes(sender, instance, **kwargs):
    """Captura estado anterior para comparação no post_save."""
    if not instance.pk:
        instance._original = None
        return
    try:
        instance._original = Issue.objects.get(pk=instance.pk)
    except Issue.DoesNotExist:
        instance._original = None


@receiver(pre_save, sender=Issue)
def handle_issue_completion(sender, instance, **kwargs):
    """Define completed_at quando o estado muda para uma categoria 'completed'."""
    if not instance.pk:
        return
    original = getattr(instance, "_original", None)
    if original is None or original.state_id == instance.state_id:
        return
    try:
        from apps.projects.models import IssueState

        new_state = IssueState.objects.get(pk=instance.state_id)
        if new_state.category == IssueState.Category.COMPLETED:
            if not instance.completed_at:
                instance.completed_at = timezone.now()
        else:
            instance.completed_at = None
    except IssueState.DoesNotExist:
        pass


@receiver(post_save, sender=Issue)
def create_issue_activities(sender, instance, created, **kwargs):
    """Registra atividades para cada campo alterado."""
    actor = getattr(instance, "_actor", None) or getattr(instance, "created_by", None)

    if created:
        IssueActivity.objects.create(
            issue=instance,
            actor=actor,
            verb="created",
        )
        return

    original = getattr(instance, "_original", None)
    if original is None:
        return

    activities = []
    for field, verb in _TRACKED_FIELDS:
        old_val = getattr(original, field, None)
        new_val = getattr(instance, field, None)
        if str(old_val) != str(new_val):
            old_identifier = None
            new_identifier = None
            if field == "state_id":
                try:
                    from apps.projects.models import IssueState
                    if old_val:
                        old_identifier = IssueState.objects.get(pk=old_val).name
                    if new_val:
                        new_identifier = IssueState.objects.get(pk=new_val).name
                except Exception:
                    pass
            elif field == "assignee_id":
                try:
                    from apps.workspaces.models import WorkspaceMember
                    if old_val:
                        old_identifier = WorkspaceMember.objects.get(pk=old_val).name
                    if new_val:
                        new_identifier = WorkspaceMember.objects.get(pk=new_val).name
                except Exception:
                    pass
            activities.append(
                IssueActivity(
                    issue=instance,
                    actor=actor,
                    verb=verb,
                    field=field,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val) if new_val is not None else None,
                    old_identifier=old_identifier,
                    new_identifier=new_identifier,
                )
            )

    if activities:
        IssueActivity.objects.bulk_create(activities)


@receiver(post_save, sender=Issue)
def notify_assignee_change(sender, instance, created, **kwargs):
    """Notifica novo assignee quando a issue é atribuída."""
    if created:
        return
    original = getattr(instance, "_original", None)
    if original is None:
        return
    if original.assignee_id == instance.assignee_id:
        return
    if not instance.assignee_id:
        return
    try:
        from apps.notifications.tasks import create_notification

        create_notification.delay(
            recipient_id=str(instance.assignee_id),
            actor_id=str(getattr(instance, "_actor", instance.reporter).id)
            if getattr(instance, "_actor", None)
            else None,
            notification_type="issue_assigned",
            entity_type="issue",
            entity_id=str(instance.id),
            title=f"Issue atribuída: {instance.title}",
        )
    except Exception:
        logger.exception("Falha ao criar notificação de atribuição")


@receiver(post_save, sender=IssueRelation)
def trigger_cpm_on_relation(sender, instance, created, **kwargs):
    """Recalcula CPM quando uma relação do tipo CPM é criada."""
    if not created:
        return
    if instance.relation_type not in IssueRelation.CPM_TYPES:
        return
    try:
        from apps.cpm.tasks import recalculate_cpm

        recalculate_cpm.apply_async(
            args=[str(instance.issue.project_id)],
            queue="cpm",
        )
    except Exception:
        logger.exception("Falha ao disparar recalculo CPM")
