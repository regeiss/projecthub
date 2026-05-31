from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from core.pagination import StandardPagination
from .models import Risk
from .serializers import RiskSerializer


def _get_project(pk, user):
    from apps.projects.models import Project
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")
    if user.role != "admin" and not project.members.filter(member=user).exists():
        raise NotFound("Projeto não encontrado.")
    return project


class RiskListCreateView(generics.ListCreateAPIView):
    serializer_class   = RiskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class   = StandardPagination

    def _project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        qs = Risk.objects.filter(project=self._project()).select_related("owner", "created_by")
        status    = self.request.query_params.get("status")
        category  = self.request.query_params.get("category")
        score_gte = self.request.query_params.get("score_gte")
        if status:
            qs = qs.filter(status=status)
        if category:
            qs = qs.filter(category=category)
        if score_gte:
            try:
                qs = qs.filter(score__gte=int(score_gte))
            except ValueError:
                pass  # ignore invalid score_gte values
        return qs

    def perform_create(self, serializer):
        serializer.save(project=self._project())


class RiskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = RiskSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ["get", "patch", "delete", "head", "options"]

    def _project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_object(self):
        project = self._project()
        try:
            return Risk.objects.select_related("owner", "created_by").get(pk=self.kwargs["pk"], project=project)
        except Risk.DoesNotExist:
            raise NotFound("Risco não encontrado.")

    def perform_destroy(self, instance):
        user = self.request.user
        project = self._project()
        is_admin = (
            user.role == "admin"
            or project.members.filter(member=user, role="admin").exists()
        )
        if not is_admin:
            raise PermissionDenied("Apenas admins podem deletar riscos.")
        instance.delete()
