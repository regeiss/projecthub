from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import Module, ModuleIssue
from .serializers import ModuleIssueSerializer, ModuleSerializer


def _get_project(pk, user):
    from apps.projects.models import Project

    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")
    if user.role != "admin" and not project.members.filter(member=user).exists():
        raise NotFound("Projeto não encontrado.")
    return project


def _get_module(module_pk, project):
    try:
        return Module.objects.get(pk=module_pk, project=project)
    except Module.DoesNotExist:
        raise NotFound("Module não encontrado.")


# ---------------------------------------------------------------------------
# Modules
# ---------------------------------------------------------------------------


class ModuleListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_pk}/modules/"""
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def _get_project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        return Module.objects.filter(project=self._get_project()).select_related("lead")

    def perform_create(self, serializer):
        serializer.save(project=self._get_project())


class ModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{project_pk}/modules/{pk}/"""
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        return _get_module(self.kwargs["pk"], project)


# ---------------------------------------------------------------------------
# Module Issues
# ---------------------------------------------------------------------------


class ModuleIssueAddView(APIView):
    """POST /modules/{pk}/issues/ — adiciona issue ao module."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            module = Module.objects.get(pk=pk)
        except Module.DoesNotExist:
            raise NotFound("Module não encontrado.")

        _get_project(module.project_id, request.user)  # verifica acesso

        issue_id = request.data.get("issue_id")
        if not issue_id:
            raise ValidationError({"issue_id": "Campo obrigatório."})

        from apps.issues.models import Issue

        try:
            issue = Issue.objects.get(pk=issue_id, project_id=module.project_id)
        except Issue.DoesNotExist:
            raise ValidationError({"issue_id": "Issue não encontrada neste projeto."})

        _, created = ModuleIssue.objects.get_or_create(module=module, issue=issue)
        return Response(
            {
                "detail": "Issue adicionada ao module."
                if created
                else "Issue já estava no module."
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ModuleIssueRemoveView(APIView):
    """DELETE /modules/{pk}/issues/{issue_id}/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, issue_id):
        try:
            module = Module.objects.get(pk=pk)
        except Module.DoesNotExist:
            raise NotFound("Module não encontrado.")

        _get_project(module.project_id, request.user)  # verifica acesso

        deleted, _ = ModuleIssue.objects.filter(
            module=module, issue_id=issue_id
        ).delete()

        if not deleted:
            raise NotFound("Issue não está neste module.")

        return Response(status=status.HTTP_204_NO_CONTENT)
