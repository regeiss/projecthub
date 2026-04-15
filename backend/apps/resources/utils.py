# backend/apps/resources/utils.py
import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import models as db_models


def get_working_days(start: date, end: date) -> int:
    """Count Mon-Fri days between start and end inclusive."""
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


def compute_workload(members, period_start: date, period_end: date, project=None) -> list:
    """
    Compute workload rows for a queryset/list of WorkspaceMember instances.
    project: optional Project instance to scope planned days and actual hours.
    """
    from apps.issues.models import Issue
    from .models import MemberCapacity, ResourceProfile, TimeEntry

    year = period_start.year
    month = period_start.month
    _, last_day = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)
    month_working = get_working_days(month_start, month_end)
    period_working = get_working_days(period_start, period_end)

    result = []
    for member in members:
        # Capacity — slice monthly by period ratio
        try:
            cap = MemberCapacity.objects.get(member=member, year=year, month=month)
            if month_working > 0:
                available = cap.available_days * Decimal(period_working) / Decimal(month_working)
            else:
                available = cap.available_days
        except MemberCapacity.DoesNotExist:
            available = None

        # Planned days
        issue_qs = Issue.objects.filter(assignee=member)
        if project:
            issue_qs = issue_qs.filter(project=project)
        else:
            issue_qs = issue_qs.filter(project__workspace_id=member.workspace_id)

        planned_issues = issue_qs.filter(
            db_models.Q(due_date__range=(period_start, period_end)) |
            db_models.Q(
                due_date__isnull=True,
                state__category__in=['backlog', 'unstarted', 'started'],
            )
        )
        planned_days = (
            planned_issues.aggregate(total=db_models.Sum('estimate_days'))['total']
            or Decimal('0')
        )

        # Actual days from time entries
        te_qs = TimeEntry.objects.filter(
            member=member,
            date__range=(period_start, period_end),
        )
        if project:
            te_qs = te_qs.filter(issue__project=project)
        else:
            te_qs = te_qs.filter(issue__project__workspace_id=member.workspace_id)

        actual_hours = (
            te_qs.aggregate(total=db_models.Sum('hours'))['total'] or Decimal('0')
        )
        actual_days = actual_hours / Decimal('8')

        # Rate and cost
        if project:
            profile = ResourceProfile.objects.filter(project=project, member=member).first()
        else:
            profile = None

        daily_rate = profile.daily_rate_brl if profile else None
        planned_cost = float(planned_days) * float(daily_rate) if daily_rate else None
        actual_cost = float(actual_days) * float(daily_rate) if daily_rate else None
        utilization_pct = (
            round(float(actual_days / available * 100), 1) if available else None
        )

        result.append({
            'member_id': str(member.id),
            'member_name': member.name,
            'member_avatar': member.avatar_url,
            'available_days': float(available) if available is not None else None,
            'planned_days': float(planned_days),
            'actual_days': float(actual_days),
            'utilization_pct': utilization_pct,
            'daily_rate_brl': str(daily_rate) if daily_rate else None,
            'planned_cost': planned_cost,
            'actual_cost': actual_cost,
        })

    return result
