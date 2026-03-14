from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import Cycle, CycleIssue
from .serializers import CycleIssueSerializer, CycleProgressSerializer, CycleSerializer


def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")
    if user.role != "admin" and not project.members.filter(member=user).exists():
        raise NotFound("Projeto não encontrado.")
    return project


def _get_cycle(cycle_pk, project):
    try:
        return Cycle.objects.get(pk=cycle_pk, project=project)
    except Cycle.DoesNotExist:
        raise NotFound("Cycle não encontrado.")


# ---------------------------------------------------------------------------
# Cycles
# ---------------------------------------------------------------------------


class CycleListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_pk}/cycles/"""
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
    """GET/PATCH/DELETE /projects/{project_pk}/cycles/{pk}/"""
    serializer_class = CycleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        return _get_cycle(self.kwargs["pk"], project)


class CycleProgressView(APIView):
    """GET /projects/{project_pk}/cycles/{pk}/progress/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk, pk):
        project = _get_project(project_pk, request.user)
        cycle = _get_cycle(pk, project)

        issues = CycleIssue.objects.filter(cycle=cycle).select_related(
            "issue__state"
        )
        total = issues.count()

        categories = {"completed": 0, "started": 0, "backlog": 0, "cancelled": 0}
        for ci in issues:
            cat = ci.issue.state.category
            if cat in categories:
                categories[cat] += 1

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


# ---------------------------------------------------------------------------
# Cycle Issues
# ---------------------------------------------------------------------------


class CycleIssueAddView(APIView):
    """POST /cycles/{pk}/issues/ — adiciona issue ao cycle."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            cycle = Cycle.objects.get(pk=pk)
        except Cycle.DoesNotExist:
            raise NotFound("Cycle não encontrado.")

        _get_project(cycle.project_id, request.user)  # verifica acesso

        issue_id = request.data.get("issue_id")
        if not issue_id:
            raise ValidationError({"issue_id": "Campo obrigatório."})

        from apps.issues.models import Issue

        try:
            issue = Issue.objects.get(pk=issue_id, project_id=cycle.project_id)
        except Issue.DoesNotExist:
            raise ValidationError({"issue_id": "Issue não encontrada neste projeto."})

        _, created = CycleIssue.objects.get_or_create(cycle=cycle, issue=issue)
        return Response(
            {"detail": "Issue adicionada ao cycle." if created else "Issue já estava no cycle."},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CycleIssueRemoveView(APIView):
    """DELETE /cycles/{pk}/issues/{issue_id}/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, issue_id):
        try:
            cycle = Cycle.objects.get(pk=pk)
        except Cycle.DoesNotExist:
            raise NotFound("Cycle não encontrado.")

        _get_project(cycle.project_id, request.user)  # verifica acesso

        deleted, _ = CycleIssue.objects.filter(
            cycle=cycle, issue_id=issue_id
        ).delete()

        if not deleted:
            raise NotFound("Issue não está neste cycle.")

        return Response(status=status.HTTP_204_NO_CONTENT)
