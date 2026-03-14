"""
Tasks Celery para o módulo Portfolio.

- refresh_all_portfolio_rag: task periódica (a cada hora) que recalcula
  o RAG de todos os portfolios e notifica owners se houve mudanças.
- refresh_portfolio_rag: recalcula RAG de um portfolio específico.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, queue="default")
def refresh_portfolio_rag(self, portfolio_id: str):
    """
    Recalcula o RAG de todos os projetos de um portfolio.
    Notifica o owner se algum RAG mudou.
    """
    try:
        from apps.portfolio.models import Portfolio
        from apps.portfolio.rag import recalculate_portfolio_rag

        portfolio = Portfolio.objects.select_related("owner").get(pk=portfolio_id)
        changes = recalculate_portfolio_rag(portfolio)

        changed = [c for c in changes if c["changed"]]
        if changed:
            logger.info(
                "Portfolio %s: %d projetos com RAG alterado",
                portfolio_id,
                len(changed),
            )
            _notify_rag_changes(portfolio, changed)

        return {"portfolio_id": portfolio_id, "changed_count": len(changed)}

    except Exception as exc:
        logger.exception("Erro ao recalcular RAG do portfolio %s", portfolio_id)
        raise self.retry(exc=exc, countdown=120)


@shared_task(bind=True, max_retries=3, queue="default")
def refresh_all_portfolio_rag(self):
    """
    Task periódica (Celery Beat): recalcula RAG de todos os portfolios.
    Configurada em config/celery.py via beat_schedule.
    """
    try:
        from apps.portfolio.models import Portfolio

        portfolio_ids = list(Portfolio.objects.values_list("id", flat=True))
        for pid in portfolio_ids:
            refresh_portfolio_rag.delay(str(pid))

        logger.info("RAG refresh disparado para %d portfolios", len(portfolio_ids))
        return {"dispatched": len(portfolio_ids)}

    except Exception as exc:
        logger.exception("Erro ao disparar refresh de todos os portfolios")
        raise self.retry(exc=exc, countdown=300)


def _notify_rag_changes(portfolio, changes: list):
    """Envia notificação ao owner do portfolio para cada projeto com RAG alterado."""
    try:
        from apps.notifications.tasks import create_notification
        from apps.portfolio.models import PortfolioProject

        owner = portfolio.owner
        pp_ids = [c["portfolio_project_id"] for c in changes]
        pp_map = {
            str(pp.pk): pp
            for pp in PortfolioProject.objects.filter(pk__in=pp_ids).select_related("project")
        }

        for change in changes:
            pp = pp_map.get(change["portfolio_project_id"])
            if not pp:
                continue

            rag_labels = {"GREEN": "Verde", "AMBER": "Amarelo", "RED": "Vermelho"}
            old_label = rag_labels.get(change["old_rag"], change["old_rag"])
            new_label = rag_labels.get(change["new_rag"], change["new_rag"])

            create_notification.delay(
                recipient_id=str(owner.pk),
                notification_type="portfolio_rag_changed",
                entity_type="portfolio_project",
                entity_id=change["portfolio_project_id"],
                title=f"RAG alterado: {pp.project.name}",
                message=(
                    f"O status do projeto {pp.project.name} no portfolio "
                    f"'{portfolio.name}' mudou de {old_label} para {new_label}."
                ),
                action_url=f"/portfolio/{portfolio.pk}/",
            )

    except Exception:
        logger.exception("Erro ao notificar mudanças de RAG do portfolio %s", portfolio.pk)
