from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
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
from .models import AccessRequest, Workspace, WorkspaceMember
from .serializers import (
    AccessRequestCreateSerializer,
    AccessRequestResolveSerializer,
    AccessRequestSerializer,
    WorkspaceCreateSerializer,
    WorkspaceMemberCreateSerializer,
    WorkspaceMemberRoleSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
    WorkspaceUpdateSerializer,
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
        user = self.request.user
        if getattr(user, "role", None) == "admin":
            return Workspace.objects.all().order_by("name")
        return Workspace.objects.filter(members__keycloak_sub=user.keycloak_sub)

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


class WorkspaceDetailView(generics.RetrieveUpdateAPIView):
    """GET /workspaces/{slug}/ · PATCH /workspaces/{slug}/ (admin only)"""
    serializer_class = WorkspaceSerializer
    lookup_field = "slug"
    queryset = Workspace.objects.all()
    http_method_names = ["get", "patch"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return WorkspaceUpdateSerializer
        return WorkspaceSerializer

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsWorkspaceAdmin()]
        return [IsAuthenticated()]


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
    """PATCH /workspaces/{slug}/members/{pk}/ — alterar papel do membro.
    DELETE /workspaces/{slug}/members/{pk}/ — remover membro do workspace."""
    serializer_class = WorkspaceMemberRoleSerializer
    permission_classes = [IsWorkspaceAdmin]
    http_method_names = ["patch", "delete"]

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

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.keycloak_sub == request.user.keycloak_sub:
            return Response(
                {"detail": "Não é possível remover a si mesmo do workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class GlobalSearchView(APIView):
    """GET /api/v1/search/?q=...&project_id=...&author_id=...&date_from=...&date_to=..."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.issues.models import Issue
        from apps.wiki.models import WikiPage

        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"issues": [], "wiki_pages": [], "total": 0})

        workspace = request.user.workspace
        project_id = request.query_params.get("project_id")
        author_id = request.query_params.get("author_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        # Issues
        issues_qs = Issue.objects.filter(
            project__workspace=workspace,
            title__icontains=q,
        ).select_related("project", "state")
        if project_id:
            issues_qs = issues_qs.filter(project_id=project_id)
        if author_id:
            issues_qs = issues_qs.filter(reporter_id=author_id)
        if date_from:
            issues_qs = issues_qs.filter(created_at__date__gte=date_from)
        if date_to:
            issues_qs = issues_qs.filter(created_at__date__lte=date_to)
        issues_qs = issues_qs.order_by("-created_at")[:20]

        issues = [
            {
                "id": str(i.id),
                "sequence_id": i.sequence_id,
                "title": i.title,
                "created_at": i.created_at.isoformat(),
                "headline": None,
                "project": {"id": str(i.project_id), "identifier": i.project.identifier, "name": i.project.name},
                "state": {"id": str(i.state_id), "name": i.state.name, "color": i.state.color} if i.state_id else None,
                "created_by": None,
            }
            for i in issues_qs
        ]

        # Wiki pages
        wiki_qs = WikiPage.objects.filter(
            space__workspace=workspace,
        ).filter(
            Q(title__icontains=q) | Q(content_text__icontains=q)
        ).select_related("space", "space__project")
        if project_id:
            wiki_qs = wiki_qs.filter(space__project_id=project_id)
        if author_id:
            wiki_qs = wiki_qs.filter(created_by_id=author_id)
        if date_from:
            wiki_qs = wiki_qs.filter(updated_at__date__gte=date_from)
        if date_to:
            wiki_qs = wiki_qs.filter(updated_at__date__lte=date_to)
        wiki_qs = wiki_qs.order_by("-updated_at")[:20]

        wiki_pages = []
        for p in wiki_qs:
            proj = p.space.project
            wiki_pages.append({
                "id": str(p.id),
                "title": p.title,
                "updated_at": p.updated_at.isoformat(),
                "headline": None,
                "space": {"id": str(p.space_id), "name": p.space.name},
                "project": {"id": str(proj.id), "name": proj.name, "identifier": proj.identifier} if proj else None,
                "created_by": None,
            })

        return Response({
            "issues": issues,
            "wiki_pages": wiki_pages,
            "total": len(issues) + len(wiki_pages),
        })


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


class MyAccessRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requests = AccessRequest.objects.filter(keycloak_sub=request.user.keycloak_sub)
        serializer = AccessRequestSerializer(requests, many=True)
        return Response(serializer.data)


class AccessRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if AccessRequest.objects.filter(
            keycloak_sub=request.user.keycloak_sub,
            status=AccessRequest.Status.PENDING,
        ).exists():
            return Response({"detail": "pending_exists"}, status=status.HTTP_409_CONFLICT)

        workspace_name = serializer.validated_data["workspace_name"].strip()
        workspace = Workspace.objects.filter(
            Q(name__iexact=workspace_name) | Q(slug__iexact=workspace_name)
        ).first()

        previous_denial_count = AccessRequest.objects.filter(
            keycloak_sub=request.user.keycloak_sub,
            status=AccessRequest.Status.DENIED,
        ).count()

        access_request = AccessRequest.objects.create(
            workspace=workspace,
            workspace_name=workspace.name if workspace else workspace_name,
            keycloak_sub=request.user.keycloak_sub,
            email=request.user.email,
            name=request.user.name,
            secretaria=serializer.validated_data["secretaria"].strip(),
            reason=serializer.validated_data["reason"].strip(),
            previous_denial_count=previous_denial_count,
        )
        return Response(AccessRequestSerializer(access_request).data, status=status.HTTP_201_CREATED)


class WorkspaceAccessRequestListView(generics.ListAPIView):
    permission_classes = [IsWorkspaceAdmin]
    serializer_class = AccessRequestSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        workspace = _get_workspace(self.kwargs["slug"])
        queryset = AccessRequest.objects.filter(workspace=workspace)
        status_value = self.request.query_params.get("status")
        if status_value in {
            AccessRequest.Status.PENDING,
            AccessRequest.Status.APPROVED,
            AccessRequest.Status.DENIED,
        }:
            queryset = queryset.filter(status=status_value)
        return queryset.order_by("-requested_at")


class WorkspaceAccessRequestResolveView(APIView):
    permission_classes = [IsWorkspaceAdmin]

    def post(self, request, slug, pk):
        workspace = _get_workspace(slug)
        serializer = AccessRequestResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            access_request = AccessRequest.objects.get(pk=pk, workspace=workspace)
        except AccessRequest.DoesNotExist:
            raise NotFound("Solicitação não encontrada.")

        action = serializer.validated_data["action"]
        access_request.resolved_at = timezone.now()
        access_request.resolved_by = request.user.keycloak_sub

        if action == "approve":
            role = serializer.validated_data["role"]
            target_workspaces = [workspace]
            extra_workspace_ids = serializer.validated_data.get("extra_workspace_ids", [])
            if extra_workspace_ids:
                target_workspaces.extend(Workspace.objects.filter(id__in=extra_workspace_ids))

            for target_workspace in target_workspaces:
                member, created = WorkspaceMember.objects.get_or_create(
                    workspace=target_workspace,
                    keycloak_sub=access_request.keycloak_sub,
                    defaults={
                        "email": access_request.email,
                        "name": access_request.name,
                        "role": role,
                    },
                )
                if not created:
                    update_fields = []
                    if member.email != access_request.email:
                        member.email = access_request.email
                        update_fields.append("email")
                    if member.name != access_request.name:
                        member.name = access_request.name
                        update_fields.append("name")
                    if member.role != WorkspaceMember.Role.ADMIN and member.role != role:
                        member.role = role
                        update_fields.append("role")
                    if update_fields:
                        update_fields.append("updated_at")
                        member.save(update_fields=update_fields)

            access_request.status = AccessRequest.Status.APPROVED
            access_request.denial_reason = None
        else:
            access_request.status = AccessRequest.Status.DENIED
            access_request.denial_reason = serializer.validated_data["denial_reason"]

        access_request.save(
            update_fields=["status", "denial_reason", "resolved_at", "resolved_by"]
        )
        return Response(AccessRequestSerializer(access_request).data)


# ─── Personal Tasks ───────────────────────────────────────────────────────────

from .models import PersonalTask
from .serializers import PersonalTaskSerializer


class PersonalTaskListCreateView(generics.ListCreateAPIView):
    serializer_class = PersonalTaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PersonalTask.objects.filter(member=self.request.user)

    def perform_create(self, serializer):
        # Place new tasks after existing ones
        last = PersonalTask.objects.filter(member=self.request.user).order_by('-sort_order').first()
        sort_order = (last.sort_order + 1) if last else 0
        serializer.save(member=self.request.user, sort_order=sort_order)


class PersonalTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PersonalTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PersonalTask.objects.filter(member=self.request.user)
