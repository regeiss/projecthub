"""
Tarefas Celery para o módulo wiki.

- save_yjs_state: persiste o estado Yjs (debounce) na WikiPage
- create_page_version: cria WikiPageVersion ao salvar mudanças significativas
"""

import logging

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="default")
def save_yjs_state(self, page_id: str, yjs_hex: str, member_id: str):
    """
    Persiste o estado Yjs de uma WikiPage após debounce.

    O WikiPageConsumer armazena o hex do estado Yjs no Redis e
    dispara esta task após N segundos de inatividade.
    """
    try:
        from django.core.cache import cache

        from apps.wiki.models import WikiPage
        from apps.workspaces.models import WorkspaceMember

        page = WikiPage.objects.get(pk=page_id)
        member = WorkspaceMember.objects.get(pk=member_id)

        # Converte hex de volta para bytes e armazena como campo binário.
        # O conteúdo Yjs é opaco para o backend — apenas persiste.
        yjs_bytes = bytes.fromhex(yjs_hex)

        with transaction.atomic():
            page.content = {"_yjs": yjs_hex}  # armazena hex em JSON para compatibilidade
            page.updated_by = member
            page.save(update_fields=["content", "updated_by", "updated_at"])

        # Limpa pending flag no Redis
        cache.delete(f"wiki_yjs_pending_{page_id}")
        logger.info("Yjs state saved for page %s by member %s", page_id, member_id)

    except Exception as exc:
        logger.exception("Erro ao salvar Yjs state para page %s", page_id)
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=3, queue="default")
def create_page_version(self, page_id: str, member_id: str, change_summary: str = ""):
    """
    Cria um snapshot de versão da WikiPage.

    Chamado quando o usuário salva explicitamente ou em intervalos regulares.
    Incrementa version_number automaticamente.
    """
    try:
        from apps.wiki.models import WikiPage, WikiPageVersion
        from apps.workspaces.models import WorkspaceMember

        page = WikiPage.objects.get(pk=page_id)
        member = WorkspaceMember.objects.get(pk=member_id)

        last = WikiPageVersion.objects.filter(page=page).order_by("-version_number").first()
        next_version = (last.version_number + 1) if last else 1

        WikiPageVersion.objects.create(
            page=page,
            version_number=next_version,
            title=page.title,
            content=page.content or {},
            change_summary=change_summary or "",
            created_by=member,
        )
        logger.info("Version %d created for page %s", next_version, page_id)

    except Exception as exc:
        logger.exception("Erro ao criar versão para page %s", page_id)
        raise self.retry(exc=exc, countdown=60)
