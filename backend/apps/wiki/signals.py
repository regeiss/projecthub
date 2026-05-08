"""Wiki signals — create WikiActivity entries on page saves."""
import logging

logger = logging.getLogger(__name__)


def create_wiki_activity(sender, instance, created, **kwargs):
    """Create a WikiActivity record whenever a WikiPage is saved."""
    try:
        from .models import WikiActivity

        actor = getattr(instance, "_actor", None)
        verb = WikiActivity.VERB_CREATED if created else WikiActivity.VERB_UPDATED
        WikiActivity.objects.create(page=instance, actor=actor, verb=verb)
    except Exception:
        logger.exception("Falha ao criar WikiActivity para página %s", instance.pk)
