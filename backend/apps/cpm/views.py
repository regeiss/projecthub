"""
Views do módulo CPM.

Endpoints:
  GET    /cpm/projects/{id}/           — lista CpmIssueData do projeto
  POST   /cpm/projects/{id}/calculate/ — força recálculo síncrono
  PATCH  /cpm/projects/{id}/issues/{issue_id}/ — atualiza duration_days
  GET    /cpm/projects/{id}/network/   — grafo React Flow
  GET    /cpm/projects/{id}/gantt/     — dados Frappe Gantt
  GET    /cpm/projects/{id}/baselines/ — lista baselines
  POST   /cpm/projects/{id}/baselines/ — salva baseline
  DELETE /cpm/projects/{id}/baselines/{baseline_id}/ — remove baseline
"""

import datetime

from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import CpmBaseline, CpmIssueData
from .serializers import (
    CpmBaselineSerializer,
    CpmIssueDataSerializer,
    CpmIssueDataUpdateSerializer,
    CpmResultSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")
    # Verifica acesso: workspace admin ou membro do projeto
    if user.role != "admin":
        if not project.members.filter(member=user).exists():
            raise NotFound("Projeto não encontrado.")
    return project


def _get_issues_map(project_id: str) -> dict:
    """Retorna {issue_id_str: issue_dict} com campos úteis para rede/gantt."""
    from apps.issues.models import Issue

    qs = Issue.objects.filter(project_id=project_id).select_related("state").values(
        "id", "title", "sequence_id", "due_date", "state__category"
    )
    return {str(row["id"]): row for row in qs}


# ---------------------------------------------------------------------------
# CPM Data
# ---------------------------------------------------------------------------

class CpmProjectDataView(generics.ListAPIView):
    """GET /cpm/projects/{project_pk}/ — lista todos os CpmIssueData do projeto."""
    serializer_class = CpmIssueDataSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        return CpmIssueData.objects.filter(issue__project=project).select_related("issue")


class CpmIssueDataUpdateView(APIView):
    """PATCH /cpm/projects/{project_pk}/issues/{issue_pk}/ — atualiza duration_days."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_pk, issue_pk):
        project = _get_project(project_pk, request.user)

        obj, _ = CpmIssueData.objects.get_or_create(issue_id=issue_pk)
        # Verifica que a issue pertence ao projeto
        if str(obj.issue.project_id) != str(project.pk):
            raise NotFound("Issue não encontrada neste projeto.")

        serializer = CpmIssueDataUpdateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Dispara recálculo assíncrono
        from .tasks import recalculate_cpm
        recalculate_cpm.apply_async(args=[str(project.pk)], queue="cpm")

        return Response(CpmIssueDataSerializer(obj).data)


# ---------------------------------------------------------------------------
# Cálculo / Recálculo
# ---------------------------------------------------------------------------

class CpmCalculateView(APIView):
    """
    POST /cpm/projects/{project_pk}/calculate/

    Força recálculo síncrono: calcula, persiste e retorna resultado imediatamente.
    Usado na UI para "Recalcular agora".
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, project_pk):
        project = _get_project(project_pk, request.user)

        # Calcula de forma síncrona para retornar resultado imediato ao usuário
        from .algorithm import calcular_cpm
        from .tasks import recalculate_cpm

        result = calcular_cpm(str(project.pk))

        # Persiste e faz broadcast de forma assíncrona
        recalculate_cpm.apply_async(args=[str(project.pk)], queue="cpm")

        return Response(CpmResultSerializer(result).data)


# ---------------------------------------------------------------------------
# Rede (React Flow)
# ---------------------------------------------------------------------------

class CpmNetworkView(APIView):
    """GET /cpm/projects/{project_pk}/network/ — grafo para React Flow."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)

        from .algorithm import build_react_flow_graph, calcular_cpm

        result = calcular_cpm(str(project.pk))
        issues_map = _get_issues_map(str(project.pk))
        rf = build_react_flow_graph(result, issues_map)

        return Response(rf)


# ---------------------------------------------------------------------------
# Gantt
# ---------------------------------------------------------------------------

class CpmGanttView(APIView):
    """GET /cpm/projects/{project_pk}/gantt/ — dados para Frappe Gantt."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)

        from .algorithm import build_gantt_data, calcular_cpm
        from apps.issues.models import Issue

        result = calcular_cpm(str(project.pk))
        issues_map = _get_issues_map(str(project.pk))

        # Determina data zero do projeto: menor start_date ou hoje
        earliest = (
            Issue.objects.filter(project=project, start_date__isnull=False)
            .order_by("start_date")
            .values_list("start_date", flat=True)
            .first()
        )
        project_start = earliest or datetime.date.today()

        gantt = build_gantt_data(result, issues_map, project_start)
        return Response(gantt)


# ---------------------------------------------------------------------------
# Baselines
# ---------------------------------------------------------------------------

class CpmBaselineListCreateView(APIView):
    """
    GET  /cpm/projects/{project_pk}/baselines/ — lista baselines
    POST /cpm/projects/{project_pk}/baselines/ — salva snapshot atual
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        baselines = CpmBaseline.objects.filter(project=project)
        serializer = CpmBaselineSerializer(baselines, many=True)
        return Response(serializer.data)

    def post(self, request, project_pk):
        project = _get_project(project_pk, request.user)

        name = request.data.get("name", "").strip()
        if not name:
            raise ValidationError({"name": "Campo obrigatório."})

        from .algorithm import calcular_cpm

        snapshot = calcular_cpm(str(project.pk))

        baseline = CpmBaseline.objects.create(
            project=project,
            name=name,
            snapshot=snapshot,
            created_by=request.user,
        )
        return Response(
            CpmBaselineSerializer(baseline).data,
            status=status.HTTP_201_CREATED,
        )


class CpmBaselineDetailView(APIView):
    """GET/DELETE /cpm/projects/{project_pk}/baselines/{baseline_pk}/"""
    permission_classes = [IsAuthenticated]

    def _get_baseline(self, project_pk, baseline_pk, user):
        project = _get_project(project_pk, user)
        try:
            return CpmBaseline.objects.get(pk=baseline_pk, project=project)
        except CpmBaseline.DoesNotExist:
            raise NotFound("Baseline não encontrado.")

    def get(self, request, project_pk, baseline_pk):
        baseline = self._get_baseline(project_pk, baseline_pk, request.user)
        return Response(CpmBaselineSerializer(baseline).data)

    def delete(self, request, project_pk, baseline_pk):
        baseline = self._get_baseline(project_pk, baseline_pk, request.user)
        baseline.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
