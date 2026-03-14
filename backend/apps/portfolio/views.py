"""
Views do módulo Portfolio.

Endpoints:
  CRUD   /portfolio/                           — portfolios do workspace
  CRUD   /portfolio/{id}/projects/             — projetos no portfolio
  GET    /portfolio/{id}/dashboard/            — EVM + RAG de todos os projetos
  GET    /portfolio/{id}/roadmap/              — dados para linha do tempo
  POST   /portfolio/{id}/recalculate-rag/      — força recálculo RAG
  CRUD   /portfolio/{id}/objectives/           — OKRs do portfolio
  POST   /portfolio/{id}/objectives/{oid}/projects/ — vincula projeto a objetivo
  POST   /portfolio/{id}/projects/{ppid}/costs/ — lança custo em projeto
  GET    /portfolio/{id}/projects/{ppid}/costs/ — lista custos
  CRUD   /portfolio/{id}/deps/                 — dependências entre projetos
"""

from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import (
    ObjectiveProject,
    Portfolio,
    PortfolioCostEntry,
    PortfolioObjective,
    PortfolioProject,
    PortfolioProjectDep,
)
from .serializers import (
    ObjectiveProjectSerializer,
    PortfolioCostEntrySerializer,
    PortfolioDashboardProjectSerializer,
    PortfolioObjectiveSerializer,
    PortfolioProjectDepSerializer,
    PortfolioProjectSerializer,
    PortfolioSerializer,
    RoadmapProjectSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_portfolio(pk, user):
    try:
        portfolio = Portfolio.objects.get(pk=pk, workspace_id=user.workspace_id)
    except Portfolio.DoesNotExist:
        raise NotFound("Portfolio não encontrado.")
    return portfolio


def _require_admin(user):
    if user.role != "admin":
        raise PermissionDenied("Apenas admins do workspace podem gerenciar portfolios.")


def _get_portfolio_project(portfolio, pp_pk):
    try:
        return PortfolioProject.objects.get(pk=pp_pk, portfolio=portfolio)
    except PortfolioProject.DoesNotExist:
        raise NotFound("Projeto não encontrado neste portfolio.")


# ---------------------------------------------------------------------------
# Portfolio CRUD
# ---------------------------------------------------------------------------

class PortfolioListCreateView(generics.ListCreateAPIView):
    """GET/POST /portfolio/"""
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Portfolio.objects.filter(workspace_id=self.request.user.workspace_id)

    def perform_create(self, serializer):
        _require_admin(self.request.user)
        serializer.save(
            workspace_id=self.request.user.workspace_id,
            owner=self.request.user,
        )


class PortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /portfolio/{pk}/"""
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        return _get_portfolio(self.kwargs["pk"], self.request.user)

    def update(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Portfolio Projects
# ---------------------------------------------------------------------------

class PortfolioProjectListCreateView(generics.ListCreateAPIView):
    """GET/POST /portfolio/{portfolio_pk}/projects/"""
    serializer_class = PortfolioProjectSerializer
    permission_classes = [IsAuthenticated]

    def _get_portfolio(self):
        return _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)

    def get_queryset(self):
        return PortfolioProject.objects.filter(
            portfolio=self._get_portfolio()
        ).select_related("project")

    def perform_create(self, serializer):
        _require_admin(self.request.user)
        portfolio = self._get_portfolio()
        serializer.save(portfolio=portfolio)


class PortfolioProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /portfolio/{portfolio_pk}/projects/{pk}/"""
    serializer_class = PortfolioProjectSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        portfolio = _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)
        return _get_portfolio_project(portfolio, self.kwargs["pk"])

    def update(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class PortfolioDashboardView(APIView):
    """GET /portfolio/{portfolio_pk}/dashboard/ — EVM + RAG de todos os projetos."""
    permission_classes = [IsAuthenticated]

    def get(self, request, portfolio_pk):
        portfolio = _get_portfolio(portfolio_pk, request.user)
        projects = PortfolioProject.objects.filter(
            portfolio=portfolio
        ).select_related("project").prefetch_related("project__risks")

        serializer = PortfolioDashboardProjectSerializer(projects, many=True)

        # Totais agregados
        from decimal import Decimal
        totals = {
            "budget_planned": sum(
                float(p.budget_planned or 0) for p in projects
            ),
            "budget_actual": sum(
                float(p.budget_actual or 0) for p in projects
            ),
            "rag_summary": {
                "GREEN": sum(1 for p in projects if p.rag_status == "GREEN"),
                "AMBER": sum(1 for p in projects if p.rag_status == "AMBER"),
                "RED": sum(1 for p in projects if p.rag_status == "RED"),
            },
        }

        return Response({
            "portfolio": PortfolioSerializer(portfolio).data,
            "projects": serializer.data,
            "totals": totals,
        })


# ---------------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------------

class PortfolioRoadmapView(APIView):
    """GET /portfolio/{portfolio_pk}/roadmap/ — dados para timeline."""
    permission_classes = [IsAuthenticated]

    def get(self, request, portfolio_pk):
        portfolio = _get_portfolio(portfolio_pk, request.user)
        projects = PortfolioProject.objects.filter(
            portfolio=portfolio
        ).select_related("project").prefetch_related("predecessor_deps")

        deps = PortfolioProjectDep.objects.filter(
            predecessor__portfolio=portfolio
        ).values("predecessor_id", "successor_id")

        return Response({
            "projects": RoadmapProjectSerializer(projects, many=True).data,
            "dependencies": list(deps),
        })


# ---------------------------------------------------------------------------
# RAG recalculation
# ---------------------------------------------------------------------------

class PortfolioRecalculateRagView(APIView):
    """POST /portfolio/{portfolio_pk}/recalculate-rag/ — força recálculo RAG."""
    permission_classes = [IsAuthenticated]

    def post(self, request, portfolio_pk):
        portfolio = _get_portfolio(portfolio_pk, request.user)
        from .rag import recalculate_portfolio_rag
        changes = recalculate_portfolio_rag(portfolio)
        return Response({"changes": changes})


# ---------------------------------------------------------------------------
# Objectives
# ---------------------------------------------------------------------------

class PortfolioObjectiveListCreateView(generics.ListCreateAPIView):
    """GET/POST /portfolio/{portfolio_pk}/objectives/"""
    serializer_class = PortfolioObjectiveSerializer
    permission_classes = [IsAuthenticated]

    def _get_portfolio(self):
        return _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)

    def get_queryset(self):
        return PortfolioObjective.objects.filter(portfolio=self._get_portfolio())

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("OKR POST raw_body=%s", request.body[:500])
        logger.warning("OKR POST parsed=%s", dict(request.data))
        s = self.get_serializer(data=request.data)
        s.is_valid()
        logger.warning("OKR serializer errors=%s", s.errors)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        _require_admin(self.request.user)
        serializer.save(portfolio=self._get_portfolio())


class PortfolioObjectiveDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /portfolio/{portfolio_pk}/objectives/{pk}/"""
    serializer_class = PortfolioObjectiveSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        portfolio = _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)
        try:
            return PortfolioObjective.objects.get(pk=self.kwargs["pk"], portfolio=portfolio)
        except PortfolioObjective.DoesNotExist:
            raise NotFound("Objetivo não encontrado.")

    def update(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().destroy(request, *args, **kwargs)


class ObjectiveProjectLinkView(APIView):
    """
    POST   /portfolio/{portfolio_pk}/objectives/{objective_pk}/projects/ — vincula
    DELETE /portfolio/{portfolio_pk}/objectives/{objective_pk}/projects/{project_pk}/ — desvincula
    """
    permission_classes = [IsAuthenticated]

    def _get_objective(self, portfolio_pk, objective_pk, user):
        portfolio = _get_portfolio(portfolio_pk, user)
        try:
            return PortfolioObjective.objects.get(pk=objective_pk, portfolio=portfolio)
        except PortfolioObjective.DoesNotExist:
            raise NotFound("Objetivo não encontrado.")

    def post(self, request, portfolio_pk, objective_pk):
        _require_admin(request.user)
        objective = self._get_objective(portfolio_pk, objective_pk, request.user)

        project_id = request.data.get("project")
        weight = request.data.get("weight", "1.0")
        if not project_id:
            raise ValidationError({"project": "Campo obrigatório."})

        obj, created = ObjectiveProject.objects.get_or_create(
            objective=objective,
            project_id=project_id,
            defaults={"weight": weight},
        )
        return Response(
            ObjectiveProjectSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, portfolio_pk, objective_pk, project_pk):
        _require_admin(request.user)
        objective = self._get_objective(portfolio_pk, objective_pk, request.user)
        deleted, _ = ObjectiveProject.objects.filter(
            objective=objective, project_id=project_pk
        ).delete()
        if not deleted:
            raise NotFound("Vínculo não encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Cost Entries
# ---------------------------------------------------------------------------

class PortfolioCostEntryListCreateView(generics.ListCreateAPIView):
    """GET/POST /portfolio/{portfolio_pk}/projects/{pp_pk}/costs/"""
    serializer_class = PortfolioCostEntrySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def _get_portfolio_project(self):
        portfolio = _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)
        return _get_portfolio_project(portfolio, self.kwargs["pp_pk"])

    def get_queryset(self):
        pp = self._get_portfolio_project()
        return PortfolioCostEntry.objects.filter(portfolio_project=pp)

    def perform_create(self, serializer):
        _require_admin(self.request.user)
        pp = self._get_portfolio_project()
        serializer.save(portfolio_project=pp, created_by=self.request.user)


class PortfolioCostEntryDestroyView(generics.DestroyAPIView):
    """DELETE /portfolio/{portfolio_pk}/projects/{pp_pk}/costs/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        portfolio = _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)
        pp = _get_portfolio_project(portfolio, self.kwargs["pp_pk"])
        return PortfolioCostEntry.objects.filter(portfolio_project=pp)

    def destroy(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Project Dependencies
# ---------------------------------------------------------------------------

class PortfolioDepListCreateView(generics.ListCreateAPIView):
    """GET/POST /portfolio/{portfolio_pk}/deps/"""
    serializer_class = PortfolioProjectDepSerializer
    permission_classes = [IsAuthenticated]

    def _get_portfolio(self):
        return _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)

    def get_queryset(self):
        portfolio = self._get_portfolio()
        return PortfolioProjectDep.objects.filter(
            predecessor__portfolio=portfolio
        )

    def perform_create(self, serializer):
        _require_admin(self.request.user)
        pred_id = self.request.data.get("predecessor")
        succ_id = self.request.data.get("successor")
        if pred_id == succ_id:
            raise ValidationError("Predecessor e successor não podem ser o mesmo projeto.")
        serializer.save()


class PortfolioDepDestroyView(generics.DestroyAPIView):
    """DELETE /portfolio/{portfolio_pk}/deps/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        portfolio = _get_portfolio(self.kwargs["portfolio_pk"], self.request.user)
        return PortfolioProjectDep.objects.filter(
            predecessor__portfolio=portfolio
        )

    def destroy(self, request, *args, **kwargs):
        _require_admin(request.user)
        return super().destroy(request, *args, **kwargs)
