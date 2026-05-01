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
    period_start and period_end must be within the same calendar month.
    project: optional Project instance to scope planned days and actual hours.
    """
    from apps.issues.models import Issue
    from .models import MemberCapacity, ResourceProfile, TimeEntry

    if period_end.year != period_start.year or period_end.month != period_start.month:
        raise ValueError('compute_workload: period must be within a single calendar month.')

    year = period_start.year
    month = period_start.month
    _, last_day = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)
    month_working = get_working_days(month_start, month_end)
    period_working = get_working_days(period_start, period_end)

    # Materialise member list once (the queryset may be evaluated multiple times otherwise)
    member_list = list(members)
    member_ids = [m.id for m in member_list]

    # --- Bulk: capacity ---
    capacities = {
        c.member_id: c
        for c in MemberCapacity.objects.filter(
            member_id__in=member_ids, year=year, month=month
        )
    }

    # --- Bulk: planned days (aggregate per member) ---
    issue_qs = Issue.objects.filter(assignee_id__in=member_ids)
    if project:
        issue_qs = issue_qs.filter(project=project)
    else:
        issue_qs = issue_qs.filter(
            project__workspace_id=member_list[0].workspace_id if member_list else None
        )

    planned_agg = dict(
        issue_qs.filter(
            db_models.Q(due_date__range=(period_start, period_end)) |
            db_models.Q(
                due_date__isnull=True,
                state__category__in=['backlog', 'unstarted', 'started'],
            )
        )
        .values('assignee_id')
        .annotate(total=db_models.Sum('estimate_days'))
        .values_list('assignee_id', 'total')
    )

    # --- Bulk: actual hours (aggregate per member) ---
    te_qs = TimeEntry.objects.filter(
        member_id__in=member_ids,
        date__range=(period_start, period_end),
    )
    if project:
        te_qs = te_qs.filter(issue__project=project)
    else:
        if member_list:
            te_qs = te_qs.filter(issue__project__workspace_id=member_list[0].workspace_id)

    actual_agg = dict(
        te_qs
        .values('member_id')
        .annotate(total=db_models.Sum('hours'))
        .values_list('member_id', 'total')
    )

    # --- Bulk: resource profiles (project view only) ---
    profiles = {}
    if project:
        profiles = {
            rp.member_id: rp
            for rp in ResourceProfile.objects.filter(
                project=project, member_id__in=member_ids
            )
        }

    # --- Build result rows ---
    result = []
    for member in member_list:
        cap = capacities.get(member.id)
        if cap is not None:
            if month_working > 0:
                available = cap.available_days * Decimal(period_working) / Decimal(month_working)
            else:
                available = cap.available_days
        else:
            available = None

        raw_planned = planned_agg.get(member.id)
        planned_days = Decimal(str(raw_planned)) if raw_planned is not None else Decimal('0')

        raw_actual = actual_agg.get(member.id)
        actual_hours = Decimal(str(raw_actual)) if raw_actual is not None else Decimal('0')
        actual_days = actual_hours / Decimal('8')

        profile = profiles.get(member.id)
        daily_rate = profile.daily_rate_brl if profile else None
        planned_cost = float(planned_days * daily_rate) if daily_rate else None
        actual_cost = float(actual_days * daily_rate) if daily_rate else None
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
