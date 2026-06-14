from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import Cycle, CycleIssue, SprintPlanAllocation, SprintPlanMemberCapacity
from .planning import apply_sprint_plan, ensure_sprint_plan
from .serializers import (
    CycleIssueSerializer,
    CycleProgressSerializer,
    CycleSerializer,
    SprintPlanAllocationSerializer,
    SprintPlanMemberCapacitySerializer,
    SprintPlanSerializer,
)


def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto nao encontrado.")
    if user.role != "admin" and not project.members.filter(member=user).exists():
        raise NotFound("Projeto nao encontrado.")
    return project


def _get_cycle(cycle_pk, project):
    try:
        return Cycle.objects.get(pk=cycle_pk, project=project)
    except Cycle.DoesNotExist:
        raise NotFound("Cycle nao encontrado.")


def _require_project_admin(project, user):
    if user.role == "admin":
        return
    if not project.members.filter(member=user, role="admin").exists():
        raise PermissionDenied("Requer perfil de administrador do projeto.")


class CycleListCreateView(generics.ListCreateAPIView):
    serializer_class = CycleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def _get_project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        return Cycle.objects.filter(project=self._get_project())

    def perform_create(self, serializer):
        serializer.save(project=self._get_project())


class CycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CycleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        return _get_cycle(self.kwargs["pk"], project)


class CycleProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)

        issues = CycleIssue.objects.filter(cycle=cycle).select_related("issue__state")
        total = issues.count()

        categories = {"completed": 0, "started": 0, "backlog": 0, "cancelled": 0}
        for cycle_issue in issues:
            category = cycle_issue.issue.state.category
            if category in categories:
                categories[category] += 1

        completion_rate = (
            round(categories["completed"] / total * 100, 1) if total else 0.0
        )

        data = {
            "total": total,
            "completed": categories["completed"],
            "started": categories["started"],
            "backlog": categories["backlog"],
            "cancelled": categories["cancelled"],
            "completion_rate": completion_rate,
        }
        return Response(data)


class CycleIssueAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            cycle = Cycle.objects.get(pk=pk)
        except Cycle.DoesNotExist:
            raise NotFound("Cycle nao encontrado.")

        _get_project(cycle.project_id, request.user)

        issue_id = request.data.get("issue_id")
        if not issue_id:
            raise ValidationError({"issue_id": "Campo obrigatorio."})

        from apps.issues.models import Issue

        try:
            issue = Issue.objects.get(pk=issue_id, project_id=cycle.project_id)
        except Issue.DoesNotExist:
            raise ValidationError({"issue_id": "Issue nao encontrada neste projeto."})

        _, created = CycleIssue.objects.get_or_create(cycle=cycle, issue=issue)
        return Response(
            {
                "detail": (
                    "Issue adicionada ao cycle."
                    if created
                    else "Issue ja estava no cycle."
                )
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CycleIssueRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, issue_id):
        try:
            cycle = Cycle.objects.get(pk=pk)
        except Cycle.DoesNotExist:
            raise NotFound("Cycle nao encontrado.")

        _get_project(cycle.project_id, request.user)

        deleted, _ = CycleIssue.objects.filter(cycle=cycle, issue_id=issue_id).delete()
        if not deleted:
            raise NotFound("Issue nao esta neste cycle.")

        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        return Response(SprintPlanSerializer(plan).data)

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        return Response(SprintPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class SprintPlanMemberCapacityListView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        _require_project_admin(project, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)

        items = request.data.get("items", [])
        updated = []
        for item in items:
            row = SprintPlanMemberCapacity.objects.get(
                plan=plan,
                member_id=item["member"],
            )
            row.override_days = item.get("override_days")
            row.note = item.get("note", row.note)
            row.save(update_fields=["override_days", "note", "updated_at"])
            updated.append(row)

        return Response(SprintPlanMemberCapacitySerializer(updated, many=True).data)


class SprintPlanAllocationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        _require_project_admin(project, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        rows = plan.allocations.select_related("issue", "planned_member").all()
        return Response(SprintPlanAllocationSerializer(rows, many=True).data)

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        _require_project_admin(project, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        serializer = SprintPlanAllocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(plan=plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SprintPlanAllocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SprintPlanAllocationSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "allocation_pk"

    def get_queryset(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        _require_project_admin(project, self.request.user)
        cycle = _get_cycle(self.kwargs["pk"], project)
        plan = ensure_sprint_plan(cycle, self.request.user)
        return SprintPlanAllocation.objects.filter(plan=plan)


class SprintPlanApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        _require_project_admin(project, request.user)
        cycle = _get_cycle(pk, project)
        plan = ensure_sprint_plan(cycle, request.user)
        plan = apply_sprint_plan(plan, request.user)
        return Response(SprintPlanSerializer(plan).data)


class CycleBurndownView(APIView):
    """
    GET /projects/{project_pk}/cycles/{pk}/burndown/
    Returns daily burndown data: ideal remaining and actual remaining per day.
    Uses IssueActivity to find when issues transitioned to a completed state.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        from datetime import date, timedelta
        from apps.issues.models import IssueActivity

        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)

        cycle_issues = CycleIssue.objects.filter(cycle=cycle).select_related("issue__state")
        total = cycle_issues.count()
        issue_ids = list(cycle_issues.values_list("issue_id", flat=True))

        if not cycle.start_date or total == 0:
            return Response({"total": total, "days": []})

        start = cycle.start_date
        end = cycle.end_date or date.today()
        today = date.today()

        # Build map: issue_id -> first completion date (from IssueActivity)
        # Activities store state changes as field='state', new_value=<state_id>
        from apps.projects.models import IssueState
        completed_state_ids = set(
            IssueState.objects.filter(
                project=project, category="completed"
            ).values_list("id", flat=True)
        )
        completed_state_strs = {str(sid) for sid in completed_state_ids}

        completion_dates: dict = {}
        activities = (
            IssueActivity.objects.filter(
                issue_id__in=issue_ids,
                field="state",
            )
            .order_by("created_at")
        )
        for act in activities:
            if act.new_value and act.new_value in completed_state_strs:
                iid = str(act.issue_id)
                if iid not in completion_dates:
                    completion_dates[iid] = act.created_at.date()

        # For issues that are currently completed but have no activity, use today
        for ci in cycle_issues:
            iid = str(ci.issue_id)
            if ci.issue.state.category == "completed" and iid not in completion_dates:
                completion_dates[iid] = today

        # Build per-day data
        days = []
        current = start
        while current <= min(end, today):
            completed_by_day = sum(
                1 for iid, cdate in completion_dates.items() if cdate <= current
            )
            remaining = total - completed_by_day
            total_days = (end - start).days or 1
            day_idx = (current - start).days
            ideal_remaining = round(total * (1 - day_idx / total_days), 2)
            days.append({
                "date": current.isoformat(),
                "remaining": remaining,
                "ideal": max(0, ideal_remaining),
            })
            current += timedelta(days=1)

        return Response({"total": total, "days": days})
