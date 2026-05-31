"""
Handlers de signal para geração automática de notificações.

Eventos monitorados:
- Issue criada com assignee
- Comentário em issue criado (notifica assignee, creator, watchers, mencionados)
- Estado da issue alterado (notifica assignee, creator, watchers)
- Menção em comentário de wiki page
- Página wiki atualizada (notifica watchers)
"""

import logging

logger = logging.getLogger(__name__)


def _watcher_ids(issue):
    """Return set of member PKs watching an issue."""
    from apps.issues.models import IssueWatcher
    return set(
        IssueWatcher.objects.filter(issue=issue).values_list("member_id", flat=True)
    )


def _wiki_watcher_ids(page):
    """Return set of member PKs watching a wiki page."""
    from apps.wiki.models import WikiPageWatcher
    return set(
        WikiPageWatcher.objects.filter(page=page).values_list("member_id", flat=True)
    )


# ---------------------------------------------------------------------------
# Issue handlers
# ---------------------------------------------------------------------------

def notify_issue_assigned_on_create(sender, instance, created, **kwargs):
    """Notifica o assignee quando uma issue nova é criada com assignee."""
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
    """Notifica criador, assignee e watchers quando alguém comenta numa issue."""
    if not created:
        return

    try:
        from .tasks import create_notification

        issue = instance.issue
        author = instance.author
        url = f"/projects/{issue.project_id}/issues/{issue.pk}/"
        title = f"Comentário em: {issue.title}"
        notified = {author.pk}

        recipients = set()
        creator = getattr(issue, "created_by", None)
        if creator and creator.pk not in notified:
            recipients.add(creator.pk)
        assignee = issue.assignee
        if assignee and assignee.pk not in notified:
            recipients.add(assignee.pk)
        recipients.update(_watcher_ids(issue) - notified)

        for pk in recipients:
            create_notification.delay(
                recipient_id=str(pk),
                notification_type="issue_commented",
                entity_type="issue",
                entity_id=str(issue.pk),
                title=title,
                message="",
                action_url=url,
                actor_id=str(author.pk),
            )

        # Menções (@mention) no conteúdo do comentário
        mentioned_ids = getattr(instance, "_mentioned_ids", None)
        if mentioned_ids is None and isinstance(instance.content, dict):
            from apps.notifications.utils import extract_tiptap_mentions
            mentioned_ids = extract_tiptap_mentions(instance.content)
        for member_id in (mentioned_ids or []):
            if str(member_id) in {str(pk) for pk in notified | recipients}:
                continue
            create_notification.delay(
                recipient_id=str(member_id),
                notification_type="issue_mentioned",
                entity_type="issue",
                entity_id=str(issue.pk),
                title=f"Você foi mencionado em: {issue.title}",
                message="",
                action_url=url,
                actor_id=str(author.pk),
            )
    except Exception:
        logger.exception("Falha ao notificar comentário na issue %s", instance.issue_id)


def notify_issue_state_changed(sender, instance, created, **kwargs):
    """Notifica criador, assignee e watchers quando o estado da issue muda."""
    if created:
        return

    original = getattr(instance, "_original", None)
    if original is None or original.state_id == instance.state_id:
        return

    try:
        from .tasks import create_notification

        actor = getattr(instance, "_actor", None)
        title = f"Estado alterado: {instance.title}"
        url = f"/projects/{instance.project_id}/issues/{instance.pk}/"
        actor_id = str(actor.pk) if actor else None
        notified = {actor.pk} if actor else set()

        recipients = set()
        creator = getattr(instance, "created_by", None)
        if creator and creator.pk not in notified:
            recipients.add(creator.pk)
        assignee = instance.assignee
        if assignee and assignee.pk not in notified:
            recipients.add(assignee.pk)
        recipients.update(_watcher_ids(instance) - notified)

        for pk in recipients:
            create_notification.delay(
                recipient_id=str(pk),
                notification_type="issue_state_changed",
                entity_type="issue",
                entity_id=str(instance.pk),
                title=title,
                message=f"Estado alterado para: {instance.state.name if instance.state else ''}",
                action_url=url,
                actor_id=actor_id,
            )
    except Exception:
        logger.exception("Falha ao notificar mudança de estado na issue %s", instance.pk)


# ---------------------------------------------------------------------------
# Wiki handlers
# ---------------------------------------------------------------------------

def notify_wiki_mentioned(sender, instance, created, **kwargs):
    """Notifica membros mencionados em comentários de wiki."""
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
                message="",
                action_url=f"/wiki/pages/{page.pk}/",
                actor_id=str(author.pk),
            )
    except Exception:
        logger.exception("Falha ao notificar menções no comentário de wiki %s", instance.pk)


def notify_wiki_page_updated(sender, instance, created, **kwargs):
    """Notifica watchers de uma wiki page quando ela é atualizada."""
    try:
        from .tasks import create_notification

        actor = getattr(instance, "_actor", None)
        actor_id = str(actor.pk) if actor else None
        watcher_ids = _wiki_watcher_ids(instance)

        verb = "criada" if created else "atualizada"
        for pk in watcher_ids:
            if actor and str(pk) == str(actor.pk):
                continue
            create_notification.delay(
                recipient_id=str(pk),
                notification_type="wiki_updated",
                entity_type="wiki_page",
                entity_id=str(instance.pk),
                title=f"Página {verb}: {instance.title}",
                message="",
                action_url=f"/wiki/pages/{instance.pk}/",
                actor_id=actor_id,
            )
    except Exception:
        logger.exception("Falha ao notificar watchers da wiki page %s", instance.pk)
