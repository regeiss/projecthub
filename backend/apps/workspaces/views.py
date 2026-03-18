from django.db import IntegrityError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.keycloak_admin import KeycloakAdminUnavailable, search_users
from core.pagination import StandardPagination
from core.permissions import IsWorkspaceAdmin

from .filters import WorkspaceMemberFilter
from .models import Workspace, WorkspaceMember
from .serializers import (
    WorkspaceCreateSerializer,
    WorkspaceMemberCreateSerializer,
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


class WorkspaceKeycloakUsersView(APIView):
    """GET /workspaces/{slug}/keycloak-users/?search=<query>"""

    permission_classes = [IsWorkspaceAdmin]

    def get(self, request, slug):
        query = request.query_params.get("search", "")
        if len(query) < 2:
            return Response(
                {"detail": "O parâmetro 'search' deve ter pelo menos 2 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace = _get_workspace(slug)
        try:
            kc_users = search_users(query)
        except KeycloakAdminUnavailable:
            return Response({"detail": "keycloak_unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        existing_subs = set(
            WorkspaceMember.objects.filter(workspace=workspace).values_list("keycloak_sub", flat=True)
        )
        filtered = [u for u in kc_users if u["sub"] not in existing_subs]
        return Response(filtered)


class WorkspaceMemberCreateView(APIView):
    """POST /workspaces/{slug}/members/create/"""

    permission_classes = [IsWorkspaceAdmin]

    def post(self, request, slug):
        serializer = WorkspaceMemberCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = _get_workspace(slug)

        keycloak_sub = serializer.validated_data["keycloak_sub"]
        if WorkspaceMember.objects.filter(workspace=workspace, keycloak_sub=keycloak_sub).exists():
            return Response({"detail": "already_member"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = WorkspaceMember.objects.create(workspace=workspace, **serializer.validated_data)
        except IntegrityError:
            return Response({"detail": "already_member"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(WorkspaceMemberSerializer(member).data, status=status.HTTP_201_CREATED)
