import calendar
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.projects.models import ProjectMember
from apps.resources.models import MemberCapacity
from apps.resources.utils import get_working_days

from .models import CycleIssue, SprintPlan, SprintPlanAllocation, SprintPlanMemberCapacity


def ensure_sprint_plan(cycle, actor):
    with transaction.atomic():
        plan, created = SprintPlan.objects.get_or_create(
            cycle=cycle,
            defaults={
                "created_by": actor,
                "status": SprintPlan.Status.DRAFT,
            },
        )
        if created:
            _bootstrap_member_capacities(plan)
            _bootstrap_allocations(plan)
    return plan


def apply_sprint_plan(plan, actor):
    with transaction.atomic():
        if plan.status == SprintPlan.Status.APPLIED:
            return plan

        for allocation in plan.allocations.select_related("issue", "planned_member"):
            issue = allocation.issue
            if issue.project_id != plan.cycle.project_id:
                raise ValueError(
                    "Sprint plan allocation issue must belong to the cycle project."
                )
            issue.assignee = allocation.planned_member
            issue.estimate_days = (
                float(allocation.planned_days)
                if allocation.planned_days is not None
                else None
            )
            issue.estimate_points = allocation.planned_story_points
            issue.save(
                update_fields=[
                    "assignee",
                    "estimate_days",
                    "estimate_points",
                    "updated_at",
                ]
            )
            CycleIssue.objects.get_or_create(cycle=plan.cycle, issue=issue)

        plan.status = SprintPlan.Status.APPLIED
        plan.applied_at = timezone.now()
        plan.applied_by = actor
        plan.save(update_fields=["status", "applied_at", "applied_by", "updated_at"])
    return plan


def _bootstrap_member_capacities(plan):
    members = [
        membership.member
        for membership in ProjectMember.objects.select_related("member").filter(
            project=plan.cycle.project
        )
    ]

    for member in members:
        SprintPlanMemberCapacity.objects.create(
            plan=plan,
            member=member,
            default_days=_prorated_capacity_for_cycle(
                member, plan.cycle.start_date, plan.cycle.end_date
            ),
        )


def _bootstrap_allocations(plan):
    cycle_issues = (
        CycleIssue.objects.select_related("issue")
        .filter(cycle=plan.cycle)
        .order_by("added_at", "id")
    )
    allocations = []
    for rank, cycle_issue in enumerate(cycle_issues, start=1):
        issue = cycle_issue.issue
        planned_days = (
            Decimal(str(issue.estimate_days)).quantize(Decimal("0.01"))
            if issue.estimate_days is not None
            else None
        )
        allocations.append(
            SprintPlanAllocation(
                plan=plan,
                issue=issue,
                planned_member=issue.assignee,
                rank=rank,
                planned_days=planned_days,
                planned_story_points=issue.estimate_points,
            )
        )

    if allocations:
        SprintPlanAllocation.objects.bulk_create(allocations)


def _prorated_capacity_for_cycle(member, cycle_start, cycle_end):
    total = Decimal("0.00")
    current = date(cycle_start.year, cycle_start.month, 1)

    while current <= cycle_end:
        month_start = current
        month_end = date(
            current.year,
            current.month,
            calendar.monthrange(current.year, current.month)[1],
        )
        overlap_start = max(cycle_start, month_start)
        overlap_end = min(cycle_end, month_end)

        if overlap_start <= overlap_end:
            capacity = MemberCapacity.objects.filter(
                member=member,
                year=current.year,
                month=current.month,
            ).first()
            if capacity:
                month_working_days = get_working_days(month_start, month_end)
                overlap_working_days = get_working_days(overlap_start, overlap_end)
                if month_working_days:
                    total += (
                        capacity.available_days
                        * Decimal(overlap_working_days)
                        / Decimal(month_working_days)
                    )

        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    return total.quantize(Decimal("0.01"))
