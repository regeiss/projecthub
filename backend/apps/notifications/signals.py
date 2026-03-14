"""
Handlers de signal para geração automática de notificações.

Eventos monitorados:
- Issue criada com assignee (create only — updates tratados em issues/signals.py)
- Comentário em issue criado
- Estado da issue alterado
- Menção em comentário de wiki page

Os handlers são conectados em NotificationsConfig.ready() para evitar
circular imports e usar os modelos já carregados.
"""

import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Issue handlers
# ---------------------------------------------------------------------------

def notify_issue_assigned_on_create(sender, instance, created, **kwargs):
    """
    Notifica o assignee quando uma issue nova é criada com assignee.
    O caso de update é tratado em apps/issues/signals.py:notify_assignee_change.
    """
    if not created:
        return

    assignee = instance.assignee
    if not assignee:
        return

    actor = getattr(instance, "_actor", None) or getattr(instance, "created_by", None)
    if actor and actor.pk == assignee.pk:
        return

    try:
        from .tasks import create_notification

        create_notification.delay(
            recipient_id=str(assignee.pk),
            notification_type="issue_assigned",
            entity_type="issue",
            entity_id=str(instance.pk),
            title=f"Issue atribuída a você: {instance.title}",
            message=f"A issue #{instance.sequence_id} foi criada e atribuída a você.",
            action_url=f"/projects/{instance.project_id}/issues/{instance.pk}/",
            actor_id=str(actor.pk) if actor else None,
        )
    except Exception:
        logger.exception("Falha ao notificar assignee na criação da issue %s", instance.pk)


def notify_issue_commented(sender, instance, created, **kwargs):
    """Notifica criador e assignee quando alguém comenta numa issue."""
    if not created:
        return

    try:
        from .tasks import create_notification

        issue = instance.issue
        author = instance.author
        url = f"/projects/{issue.project_id}/issues/{issue.pk}/"
        title = f"Comentário em: {issue.title}"
        msg = (instance.content or "")[:200]
        notified = {author.pk}

        creator = getattr(issue, "created_by", None)
        if creator and creator.pk not in notified:
            notified.add(creator.pk)
            create_notification.delay(
                recipient_id=str(creator.pk),
                notification_type="issue_commented",
                entity_type="issue",
                entity_id=str(issue.pk),
                title=title,
                message=msg,
                action_url=url,
                actor_id=str(author.pk),
            )

        assignee = issue.assignee
        if assignee and assignee.pk not in notified:
            notified.add(assignee.pk)
            create_notification.delay(
                recipient_id=str(assignee.pk),
                notification_type="issue_commented",
                entity_type="issue",
                entity_id=str(issue.pk),
                title=title,
                message=msg,
                action_url=url,
                actor_id=str(author.pk),
            )
    except Exception:
        logger.exception("Falha ao notificar comentário na issue %s", instance.issue_id)


def notify_issue_state_changed(sender, instance, created, **kwargs):
    """Notifica criador e assignee quando o estado da issue muda."""
    if created:
        return

    original = getattr(instance, "_original", None)
    if original is None:
        return
    if original.state_id == instance.state_id:
        return

    try:
        from .tasks import create_notification

        actor = getattr(instance, "_actor", None)
        title = f"Estado alterado: {instance.title}"
        msg = f"O estado da issue #{instance.sequence_id} foi alterado."
        url = f"/projects/{instance.project_id}/issues/{instance.pk}/"
        actor_id = str(actor.pk) if actor else None
        notified = {actor.pk} if actor else set()

        creator = getattr(instance, "created_by", None)
        if creator and creator.pk not in notified:
            notified.add(creator.pk)
            create_notification.delay(
                recipient_id=str(creator.pk),
                notification_type="issue_state_changed",
                entity_type="issue",
                entity_id=str(instance.pk),
                title=title,
                message=msg,
                action_url=url,
                actor_id=actor_id,
            )

        assignee = instance.assignee
        if assignee and assignee.pk not in notified:
            create_notification.delay(
                recipient_id=str(assignee.pk),
                notification_type="issue_state_changed",
                entity_type="issue",
                entity_id=str(instance.pk),
                title=title,
                message=msg,
                action_url=url,
                actor_id=actor_id,
            )
    except Exception:
        logger.exception("Falha ao notificar mudança de estado na issue %s", instance.pk)


# ---------------------------------------------------------------------------
# Wiki handlers
# ---------------------------------------------------------------------------

def notify_wiki_mentioned(sender, instance, created, **kwargs):
    """
    Notifica membros mencionados em comentários de wiki.

    O frontend deve popular `instance._mentioned_ids` antes do save,
    ou enviar `mentioned_ids` no payload (tratado na view).
    """
    if not created:
        return

    mentioned_ids = getattr(instance, "_mentioned_ids", [])
    if not mentioned_ids:
        return

    try:
        from .tasks import create_notification

        page = instance.page
        author = instance.author

        for member_id in mentioned_ids:
            if str(member_id) == str(author.pk):
                continue
            create_notification.delay(
                recipient_id=str(member_id),
                notification_type="wiki_mentioned",
                entity_type="wiki_page",
                entity_id=str(page.pk),
                title=f"Você foi mencionado em: {page.title}",
                message=(instance.content or "")[:200],
                action_url=f"/wiki/pages/{page.pk}/",
                actor_id=str(author.pk),
            )
    except Exception:
        logger.exception("Falha ao notificar menções no comentário de wiki %s", instance.pk)
