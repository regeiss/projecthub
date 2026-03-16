from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardPagination
from core.permissions import IsWorkspaceAdmin

from .filters import WorkspaceMemberFilter
from .models import Workspace, WorkspaceMember
from .serializers import (
    WorkspaceCreateSerializer,
    WorkspaceMemberRoleSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)


def _get_workspace(slug):
    try:
        return Workspace.objects.get(slug=slug)
    except Workspace.DoesNotExist:
        raise NotFound(f"Workspace '{slug}' não encontrado.")


class WorkspaceListView(generics.ListCreateAPIView):
    """GET/POST /workspaces/ — lista e cria workspaces."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(members__keycloak_sub=self.request.user.keycloak_sub)

    def perform_create(self, serializer):
        workspace = serializer.save()
        user = self.request.user
        WorkspaceMember.objects.create(
            workspace=workspace,
            keycloak_sub=user.keycloak_sub,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            role=WorkspaceMember.Role.ADMIN,
        )


class WorkspaceDetailView(generics.RetrieveAPIView):
    """GET /workspaces/{slug}/"""
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"
    queryset = Workspace.objects.all()


class WorkspaceMemberListView(generics.ListAPIView):
    """GET /workspaces/{slug}/members/"""
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = WorkspaceMemberFilter

    def get_queryset(self):
        workspace = _get_workspace(self.kwargs["slug"])
        return WorkspaceMember.objects.filter(workspace=workspace)


class WorkspaceMemberUpdateView(generics.UpdateAPIView):
    """PATCH /workspaces/{slug}/members/{pk}/ — alterar papel do membro."""
    serializer_class = WorkspaceMemberRoleSerializer
    permission_classes = [IsWorkspaceAdmin]
    http_method_names = ["patch"]

    def get_object(self):
        workspace = _get_workspace(self.kwargs["slug"])
        try:
            member = WorkspaceMember.objects.get(
                pk=self.kwargs["pk"], workspace=workspace
            )
        except WorkspaceMember.DoesNotExist:
            raise NotFound("Membro não encontrado.")
        return member

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WorkspaceMemberSerializer(instance).data)
