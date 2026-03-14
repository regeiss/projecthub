import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.files.storage import default_storage
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.pagination import ActivityCursorPagination, StandardPagination

from .filters import IssueFilter
from .models import Issue, IssueActivity, IssueAttachment, IssueComment, IssueRelation
from .permissions import IsIssueReporterOrProjectMember
from .serializers import (
    IssueActivitySerializer,
    IssueAttachmentSerializer,
    IssueCommentSerializer,
    IssueRelationSerializer,
    IssueSerializer,
    IssueStateUpdateSerializer,
)

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
    "application/zip",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _get_issue(pk, user):
    try:
        issue = Issue.objects.select_related(
            "project", "state", "assignee", "reporter", "created_by"
        ).get(pk=pk)
    except Issue.DoesNotExist:
        raise NotFound("Issue não encontrada.")

    if user.role == "admin":
        return issue
    if not issue.project.members.filter(member=user).exists():
        raise NotFound("Issue não encontrada.")
    return issue


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------


class IssueViewSet(ModelViewSet):
    """
    CRUD de issues + actions: state, comments, activities, attachments, relations.
    GET /issues/?project_id=<uuid> — project_id é obrigatório no list.
    """
    serializer_class = IssueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = IssueFilter
    search_fields = ["title"]
    ordering_fields = ["sort_order", "created_at", "updated_at", "priority", "due_date"]
    ordering = ["sort_order"]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        user = self.request.user
        qs = Issue.objects.select_related(
            "project", "state", "assignee", "reporter", "created_by"
        ).prefetch_related("labels")

        if self.action == "list":
            project_id = self.request.query_params.get("project_id")
            if not project_id:
                raise ValidationError({"project_id": "Este filtro é obrigatório."})
            # Verificar acesso ao projeto
            from apps.projects.models import Project

            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                return Issue.objects.none()

            if user.role != "admin" and not project.members.filter(member=user).exists():
                return Issue.objects.none()

            return qs.filter(project_id=project_id)

        # Para retrieve/update/delete, filtrar pelo acesso do usuário
        if user.role == "admin":
            return qs
        return qs.filter(project__members__member=user).distinct()

    def perform_create(self, serializer):
        project_id = self.request.data.get("project")
        if not project_id:
            raise ValidationError({"project": "Campo obrigatório."})
        from apps.projects.models import Project

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise ValidationError({"project": "Projeto não encontrado."})
        user = self.request.user
        if user.role != "admin" and not project.members.filter(member=user).exists():
            raise PermissionDenied("Sem acesso ao projeto.")
        serializer.save(project=project)

    def perform_update(self, serializer):
        serializer.instance._actor = self.request.user
        serializer.save()

    @action(detail=True, methods=["patch"], url_path="state")
    def update_state(self, request, pk=None):
        """PATCH /issues/{id}/state/ — move issue no board."""
        issue = _get_issue(pk, request.user)
        serializer = IssueStateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        issue.state_id = data["state_id"]
        issue.sort_order = data["sort_order"]
        issue._actor = request.user
        issue.save(update_fields=["state_id", "sort_order", "updated_at"])

        # Broadcast via WebSocket
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"project_{issue.project_id}",
                {
                    "type": "issue_updated",
                    "payload": {
                        "issueId": str(issue.id),
                        "stateId": str(issue.state_id),
                        "sortOrder": issue.sort_order,
                    },
                    "sender": "server",
                },
            )
        except Exception:
            logger.exception("Falha no broadcast de issue.updated")

        return Response(IssueSerializer(issue, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


class IssueCommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /issues/{issue_pk}/comments/"""
    serializer_class = IssueCommentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def _get_issue(self):
        return _get_issue(self.kwargs["issue_pk"], self.request.user)

    def get_queryset(self):
        return IssueComment.objects.filter(
            issue=self._get_issue()
        ).select_related("author")

    def perform_create(self, serializer):
        serializer.save(issue=self._get_issue())


class IssueCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /issues/{issue_pk}/comments/{pk}/"""
    serializer_class = IssueCommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        issue = _get_issue(self.kwargs["issue_pk"], self.request.user)
        try:
            comment = IssueComment.objects.get(pk=self.kwargs["pk"], issue=issue)
        except IssueComment.DoesNotExist:
            raise NotFound("Comentário não encontrado.")
        # Somente o autor pode editar/deletar
        if (
            self.request.method in ("PATCH", "DELETE")
            and str(comment.author_id) != str(self.request.user.id)
            and self.request.user.role != "admin"
        ):
            raise PermissionDenied("Somente o autor pode editar este comentário.")
        return comment


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------


class IssueActivityListView(generics.ListAPIView):
    """GET /issues/{issue_pk}/activities/"""
    serializer_class = IssueActivitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ActivityCursorPagination

    def get_queryset(self):
        issue = _get_issue(self.kwargs["issue_pk"], self.request.user)
        return IssueActivity.objects.filter(issue=issue).select_related("actor")


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------


class IssueAttachmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /issues/{issue_pk}/attachments/"""
    serializer_class = IssueAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def _get_issue(self):
        return _get_issue(self.kwargs["issue_pk"], self.request.user)

    def get_queryset(self):
        return IssueAttachment.objects.filter(issue=self._get_issue())

    def create(self, request, *args, **kwargs):
        issue = self._get_issue()
        file_obj = request.FILES.get("file")
        if not file_obj:
            raise ValidationError({"file": "Arquivo obrigatório."})
        if file_obj.size > MAX_FILE_SIZE:
            raise ValidationError({"file": f"Tamanho máximo: {MAX_FILE_SIZE // 1024 // 1024}MB."})
        if file_obj.content_type not in ALLOWED_MIME_TYPES:
            raise ValidationError({"file": "Tipo de arquivo não permitido."})

        # Salva no storage (OCI ou local)
        path = default_storage.save(
            f"attachments/{issue.project_id}/{issue.id}/{file_obj.name}", file_obj
        )

        attachment = IssueAttachment.objects.create(
            issue=issue,
            uploaded_by=request.user,
            filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            storage_path=path,
        )
        return Response(
            IssueAttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED,
        )


class IssueAttachmentDestroyView(generics.DestroyAPIView):
    """DELETE /issues/{issue_pk}/attachments/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_object(self):
        issue = _get_issue(self.kwargs["issue_pk"], self.request.user)
        try:
            return IssueAttachment.objects.get(pk=self.kwargs["pk"], issue=issue)
        except IssueAttachment.DoesNotExist:
            raise NotFound("Anexo não encontrado.")

    def perform_destroy(self, instance):
        try:
            default_storage.delete(instance.storage_path)
        except Exception:
            logger.exception("Falha ao deletar arquivo do storage")
        instance.delete()


# ---------------------------------------------------------------------------
# Relations
# ---------------------------------------------------------------------------


class IssueRelationListCreateView(generics.ListCreateAPIView):
    """GET/POST /issues/{issue_pk}/relations/"""
    serializer_class = IssueRelationSerializer
    permission_classes = [IsAuthenticated]

    def _get_issue(self):
        return _get_issue(self.kwargs["issue_pk"], self.request.user)

    def get_queryset(self):
        return IssueRelation.objects.filter(issue=self._get_issue())

    def perform_create(self, serializer):
        serializer.save(issue=self._get_issue())


class IssueRelationDestroyView(generics.DestroyAPIView):
    """DELETE /issues/{issue_pk}/relations/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_object(self):
        issue = _get_issue(self.kwargs["issue_pk"], self.request.user)
        try:
            return IssueRelation.objects.get(pk=self.kwargs["pk"], issue=issue)
        except IssueRelation.DoesNotExist:
            raise NotFound("Relação não encontrada.")
