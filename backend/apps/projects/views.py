import uuid

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination
from core.permissions import IsProjectAdmin, IsWorkspaceMember

from .filters import ProjectFilter
from .models import IssueState, Label, Project, ProjectMember
from .permissions import CanManageProjectMembers
from .serializers import (
    IssueStateSerializer,
    LabelSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
)


def _get_project(pk, user):
    """Retorna projeto ou 404. Workspace admins veem todos; demais só os seus."""
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        raise NotFound("Projeto não encontrado.")

    if user.role == "admin":
        return project
    if not project.members.filter(member=user).exists():
        raise NotFound("Projeto não encontrado.")
    return project


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /projects/   — lista projetos acessíveis ao usuário
    POST /projects/   — cria projeto (workspace admin ou member)
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsWorkspaceMember]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProjectFilter

    def get_queryset(self):
        user = self.request.user
        workspace = user.workspace
        if user.role == "admin":
            return Project.objects.filter(workspace=workspace)
        return Project.objects.filter(
            members__member=user, workspace=workspace
        ).distinct()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{id}/"""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        return _get_project(self.kwargs["pk"], self.request.user)

    def check_write_permissions(self):
        project = self.get_object()
        if self.request.user.role != "admin":
            pm = ProjectMember.objects.filter(
                project=project, member=self.request.user, role="admin"
            ).exists()
            if not pm:
                raise PermissionDenied("Requer perfil de administrador do projeto.")

    def update(self, request, *args, **kwargs):
        self.check_write_permissions()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_write_permissions()
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Project Members
# ---------------------------------------------------------------------------


class ProjectMemberListCreateView(generics.ListCreateAPIView):
    """
    GET  /projects/{project_pk}/members/
    POST /projects/{project_pk}/members/
    """
    serializer_class = ProjectMemberSerializer
    permission_classes = [IsAuthenticated]

    def _get_project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        project = self._get_project()
        return ProjectMember.objects.filter(project=project).select_related("member")

    def perform_create(self, serializer):
        project = self._get_project()
        user = self.request.user
        # Somente project admin pode adicionar membros
        if user.role != "admin" and not ProjectMember.objects.filter(
            project=project, member=user, role="admin"
        ).exists():
            raise PermissionDenied("Requer perfil de administrador do projeto.")

        from apps.workspaces.models import WorkspaceMember
        member_id = self.request.data.get("member_id")
        try:
            member = WorkspaceMember.objects.get(pk=member_id)
        except WorkspaceMember.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"member_id": "Membro não encontrado."})

        serializer.save(project=project, member=member)


class ProjectMemberDestroyView(generics.DestroyAPIView):
    """DELETE /projects/{project_pk}/members/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        user = self.request.user
        if user.role != "admin" and not ProjectMember.objects.filter(
            project=project, member=user, role="admin"
        ).exists():
            raise PermissionDenied("Requer perfil de administrador do projeto.")
        try:
            return ProjectMember.objects.get(project=project, pk=self.kwargs["pk"])
        except ProjectMember.DoesNotExist:
            raise NotFound("Membro não encontrado.")


# ---------------------------------------------------------------------------
# Issue States
# ---------------------------------------------------------------------------


class IssueStateListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_pk}/states/"""
    serializer_class = IssueStateSerializer
    permission_classes = [IsAuthenticated]

    def _get_project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        return IssueState.objects.filter(project=self._get_project())

    def perform_create(self, serializer):
        serializer.save(project=self._get_project())


class IssueStateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{project_pk}/states/{pk}/"""
    serializer_class = IssueStateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        try:
            return IssueState.objects.get(project=project, pk=self.kwargs["pk"])
        except IssueState.DoesNotExist:
            raise NotFound("Estado não encontrado.")


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------


class LabelListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_pk}/labels/"""
    serializer_class = LabelSerializer
    permission_classes = [IsAuthenticated]

    def _get_project(self):
        return _get_project(self.kwargs["project_pk"], self.request.user)

    def get_queryset(self):
        return Label.objects.filter(project=self._get_project())

    def perform_create(self, serializer):
        serializer.save(project=self._get_project())


class LabelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /projects/{project_pk}/labels/{pk}/"""
    serializer_class = LabelSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = _get_project(self.kwargs["project_pk"], self.request.user)
        try:
            return Label.objects.get(project=project, pk=self.kwargs["pk"])
        except Label.DoesNotExist:
            raise NotFound("Label não encontrada.")
