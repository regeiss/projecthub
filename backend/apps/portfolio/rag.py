"""
Lógica RAG (Red-Amber-Green) e EVM (Earned Value Management) para portfolio.

RAG compara % de issues concluídas vs % de tempo decorrido:
  variation = pct_issues_completed - pct_time_elapsed
  GREEN  : variation >= -5%
  AMBER  : -5% > variation >= -15%
  RED    : variation < -15%
  Se rag_override=True, retorna rag_status armazenado sem recalcular.

EVM usa a view v_portfolio_evm ou calcula diretamente via ORM:
  PV  = budget_planned × pct_time_elapsed / 100
  EV  = budget_planned × pct_issues_completed / 100
  AC  = budget_actual (lançado manualmente via PortfolioCostEntry)
  CPI = EV / AC   (> 1 = abaixo do orçamento)
  SPI = EV / PV   (> 1 = adiantado)
"""

import logging
from datetime import date
from decimal import Decimal

logger = logging.getLogger(__name__)


def _get_progress_metrics(portfolio_project) -> dict:
    """
    Retorna pct_issues_completed e pct_time_elapsed para um PortfolioProject.
    Calcula via ORM (não depende da view v_portfolio_evm para flexibilidade).
    """
    from apps.issues.models import Issue
    from apps.projects.models import IssueState

    project_id = portfolio_project.project_id

    total = Issue.objects.filter(project_id=project_id).count()
    completed = Issue.objects.filter(
        project_id=project_id,
        state__category=IssueState.Category.COMPLETED,
    ).count()

    pct_issues = round(completed / total * 100, 2) if total else 0.0

    start = portfolio_project.start_date
    end = portfolio_project.end_date
    today = date.today()

    if start and end and end > start:
        elapsed = (today - start).days
        total_days = (end - start).days
        pct_time = round(min(elapsed / total_days * 100, 100), 2)
    else:
        pct_time = 0.0

    return {
        "total_issues": total,
        "completed_issues": completed,
        "pct_issues_completed": pct_issues,
        "pct_time_elapsed": pct_time,
    }


def calcular_rag(portfolio_project) -> str:
    """
    Calcula e retorna o status RAG do projeto no portfolio.

    Respeita rag_override: se True, retorna rag_status sem recalcular.
    """
    if portfolio_project.rag_override:
        return portfolio_project.rag_status

    metrics = _get_progress_metrics(portfolio_project)
    variation = metrics["pct_issues_completed"] - metrics["pct_time_elapsed"]

    if variation >= -5:
        return "GREEN"
    elif variation >= -15:
        return "AMBER"
    else:
        return "RED"


def calcular_evm(portfolio_project) -> dict:
    """
    Calcula métricas EVM (Earned Value Management) para um PortfolioProject.

    Retorna:
    {
        pct_issues_completed: float,
        pct_time_elapsed: float,
        pv: Decimal,   # Planned Value
        ev: Decimal,   # Earned Value
        ac: Decimal,   # Actual Cost
        cpi: float,    # Cost Performance Index
        spi: float,    # Schedule Performance Index
        budget_planned: Decimal,
        budget_actual: Decimal,
        variance_cost: Decimal,     # EV - AC
        variance_schedule: Decimal, # EV - PV
    }
    """
    metrics = _get_progress_metrics(portfolio_project)

    budget = portfolio_project.budget_planned or Decimal("0")
    ac = portfolio_project.budget_actual or Decimal("0")

    pct_issues = Decimal(str(metrics["pct_issues_completed"])) / Decimal("100")
    pct_time = Decimal(str(metrics["pct_time_elapsed"])) / Decimal("100")

    pv = (budget * pct_time).quantize(Decimal("0.01"))
    ev = (budget * pct_issues).quantize(Decimal("0.01"))

    cpi = float(ev / ac) if ac else 0.0
    spi = float(ev / pv) if pv else 0.0

    return {
        "pct_issues_completed": metrics["pct_issues_completed"],
        "pct_time_elapsed": metrics["pct_time_elapsed"],
        "total_issues": metrics["total_issues"],
        "completed_issues": metrics["completed_issues"],
        "pv": pv,
        "ev": ev,
        "ac": ac,
        "cpi": round(cpi, 3),
        "spi": round(spi, 3),
        "budget_planned": budget,
        "budget_actual": ac,
        "variance_cost": (ev - ac).quantize(Decimal("0.01")),
        "variance_schedule": (ev - pv).quantize(Decimal("0.01")),
    }


def recalculate_portfolio_rag(portfolio) -> list[dict]:
    """
    Recalcula o RAG de todos os PortfolioProject de um portfolio.
    Retorna lista de {portfolio_project_id, old_rag, new_rag, changed}.
    Persiste apenas os que mudaram.
    """
    from .models import PortfolioProject

    results = []
    projects = PortfolioProject.objects.filter(portfolio=portfolio)

    changed = []
    for pp in projects:
        old_rag = pp.rag_status
        new_rag = calcular_rag(pp)
        changed_flag = old_rag != new_rag

        results.append(
            {
                "portfolio_project_id": str(pp.pk),
                "project_id": str(pp.project_id),
                "old_rag": old_rag,
                "new_rag": new_rag,
                "changed": changed_flag,
            }
        )

        if changed_flag:
            pp.rag_status = new_rag
            changed.append(pp)

    if changed:
        PortfolioProject.objects.bulk_update(changed, ["rag_status"])

    return results
