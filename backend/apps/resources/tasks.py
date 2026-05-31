# backend/apps/resources/tasks.py
import calendar
import logging
from datetime import date
from decimal import Decimal

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(queue='default')
def sync_labor_costs(issue_id: str, year: int, month: int):
    """
    Aggregate TimeEntry hours for (project, year, month) and upsert a
    PortfolioCostEntry(category='labor') for the portfolio project.
    Idempotent: deletes the previous auto entry and recreates it.
    30-second countdown debounce is applied by the signal caller.
    """
    from apps.issues.models import Issue
    from apps.portfolio.models import PortfolioCostEntry, PortfolioProject
    from .models import ResourceProfile, TimeEntry

    try:
        issue = Issue.objects.select_related('project').get(id=issue_id)
    except Issue.DoesNotExist:
        return

    project = issue.project
    portfolio_project = PortfolioProject.objects.filter(project=project).first()
    if not portfolio_project:
        return

    entries = (
        TimeEntry.objects
        .filter(issue__project=project, date__year=year, date__month=month)
        .select_related('member')
    )

    # Bulk-fetch resource profiles for all members in these entries
    member_ids = entries.values_list('member_id', flat=True).distinct()
    profiles = {
        rp.member_id: rp.daily_rate_brl
        for rp in ResourceProfile.objects.filter(project=project, member_id__in=member_ids)
    }

    total_cost = Decimal('0')
    for entry in entries:
        rate = profiles.get(entry.member_id)
        if rate is None:
            logger.warning(
                'sync_labor_costs: no ResourceProfile for member %s on project %s — hours skipped',
                entry.member_id, project.id,
            )
            continue
        total_cost += (entry.hours / Decimal('8')) * rate

    _, last_day = calendar.monthrange(year, month)
    entry_date = date(year, month, last_day)
    description = f'Auto: mão de obra {year:04d}-{month:02d}'

    # Idempotent atomic upsert: delete existing auto entry then recreate
    with transaction.atomic():
        PortfolioCostEntry.objects.filter(
            portfolio_project=portfolio_project,
            date=entry_date,
            category='labor',
            description=description,
        ).delete()

        if total_cost > 0:
            PortfolioCostEntry.objects.create(
                portfolio_project=portfolio_project,
                date=entry_date,
                category='labor',
                amount=total_cost,
                description=description,
                created_by=None,
            )
