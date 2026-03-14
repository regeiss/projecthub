import secrets

from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination

from .models import WikiIssueLink, WikiPage, WikiPageComment, WikiPageVersion, WikiSpace
from .permissions import can_admin_space, can_read_space, can_write_space
from .serializers import (
    WikiIssueLinkSerializer,
    WikiPageCommentSerializer,
    WikiPageDetailSerializer,
    WikiPageListSerializer,
    WikiPageVersionSerializer,
    WikiSpaceSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_space(pk, user):
    try:
        space = WikiSpace.objects.get(pk=pk)
    except WikiSpace.DoesNotExist:
        raise NotFound("WikiSpace não encontrado.")
    if not can_read_space(user, space):
        raise NotFound("WikiSpace não encontrado.")
    return space


def _get_page(pk, user, require_write=False):
    try:
        page = WikiPage.objects.select_related("space").get(pk=pk)
    except WikiPage.DoesNotExist:
        raise NotFound("Página não encontrada.")
    if not can_read_space(user, page.space):
        raise NotFound("Página não encontrada.")
    if require_write and page.is_locked and user.role != "admin":
        raise PermissionDenied("Página bloqueada — apenas admins podem editar.")
    if require_write and not can_write_space(user, page.space):
        raise PermissionDenied("Sem permissão para editar páginas neste space.")
    return page


# ---------------------------------------------------------------------------
# WikiSpace
# ---------------------------------------------------------------------------

class WikiSpaceListCreateView(generics.ListCreateAPIView):
    """GET/POST /wiki/spaces/"""
    serializer_class = WikiSpaceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user
        qs = WikiSpace.objects.filter(workspace_id=user.workspace_id)
        # Filtra spaces privados de outros
        visible = [s.pk for s in qs if can_read_space(user, s)]
        return WikiSpace.objects.filter(pk__in=visible).order_by("name")

    def perform_create(self, serializer):
        user = self.request.user
        project_id = self.request.data.get("project")
        if project_id:
            from apps.projects.models import ProjectMember
            if user.role != "admin":
                if not ProjectMember.objects.filter(project_id=project_id, member=user).exists():
                    raise PermissionDenied("Sem acesso ao projeto.")
        serializer.save(workspace_id=user.workspace_id, created_by=user)


class WikiSpaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /wiki/spaces/{pk}/"""
    serializer_class = WikiSpaceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        return _get_space(self.kwargs["pk"], self.request.user)

    def update(self, request, *args, **kwargs):
        space = self.get_object()
        if not can_admin_space(request.user, space):
            raise PermissionDenied("Sem permissão para editar este space.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        space = self.get_object()
        if not can_admin_space(request.user, space):
            raise PermissionDenied("Sem permissão para deletar este space.")
        return super().destroy(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# WikiPage
# ---------------------------------------------------------------------------

class WikiPageListCreateView(generics.ListCreateAPIView):
    """GET/POST /wiki/spaces/{space_pk}/pages/"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WikiPageDetailSerializer
        return WikiPageListSerializer

    def _get_space(self):
        return _get_space(self.kwargs["space_pk"], self.request.user)

    def get_queryset(self):
        space = self._get_space()
        parent_id = self.request.query_params.get("parent")
        qs = WikiPage.objects.filter(space=space, is_archived=False)
        if parent_id == "null" or parent_id == "":
            qs = qs.filter(parent__isnull=True)
        elif parent_id:
            qs = qs.filter(parent_id=parent_id)
        return qs.order_by("sort_order")

    def perform_create(self, serializer):
        space = self._get_space()
        if not can_write_space(self.request.user, space):
            raise PermissionDenied("Sem permissão para criar páginas neste space.")
        serializer.save(
            space=space,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


class WikiPageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /wiki/pages/{pk}/"""
    serializer_class = WikiPageDetailSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        require_write = self.request.method in ("PATCH", "DELETE")
        return _get_page(self.kwargs["pk"], self.request.user, require_write=require_write)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        page = self.get_object()
        if not can_admin_space(request.user, page.space):
            raise PermissionDenied("Apenas admins podem deletar páginas.")
        page.is_archived = True
        page.save(update_fields=["is_archived"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class WikiPageMoveView(APIView):
    """PATCH /wiki/pages/{pk}/move/ — reordena/reparenta a página."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        page = _get_page(pk, request.user, require_write=True)
        sort_order = request.data.get("sort_order")
        parent_id = request.data.get("parent")

        update_fields = []
        if sort_order is not None:
            page.sort_order = float(sort_order)
            update_fields.append("sort_order")
        if "parent" in request.data:
            page.parent_id = parent_id
            update_fields.append("parent")

        if update_fields:
            page.save(update_fields=update_fields)

        return Response(WikiPageDetailSerializer(page).data)


class WikiPagePublishView(APIView):
    """POST /wiki/pages/{pk}/publish/ — publica ou despublica a página."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        page = _get_page(pk, request.user, require_write=True)
        publish = request.data.get("publish", True)

        with transaction.atomic():
            if publish and not page.is_published:
                page.is_published = True
                page.published_token = secrets.token_urlsafe(32)
                page.save(update_fields=["is_published", "published_token"])
            elif not publish and page.is_published:
                page.is_published = False
                page.published_token = None
                page.save(update_fields=["is_published", "published_token"])

        return Response(WikiPageDetailSerializer(page).data)


class WikiPagePublicView(APIView):
    """GET /wiki/public/{token}/ — página pública sem autenticação."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            page = WikiPage.objects.get(published_token=token, is_published=True)
        except WikiPage.DoesNotExist:
            raise NotFound("Página não encontrada.")
        return Response(WikiPageDetailSerializer(page).data)


# ---------------------------------------------------------------------------
# WikiPageVersion
# ---------------------------------------------------------------------------

class WikiPageVersionListView(generics.ListAPIView):
    """GET /wiki/pages/{page_pk}/versions/"""
    serializer_class = WikiPageVersionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        page = _get_page(self.kwargs["page_pk"], self.request.user)
        return WikiPageVersion.objects.filter(page=page)


class WikiPageVersionRestoreView(APIView):
    """POST /wiki/pages/{page_pk}/versions/{pk}/restore/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, page_pk, pk):
        page = _get_page(page_pk, request.user, require_write=True)
        try:
            version = WikiPageVersion.objects.get(pk=pk, page=page)
        except WikiPageVersion.DoesNotExist:
            raise NotFound("Versão não encontrada.")

        with transaction.atomic():
            page.title = version.title
            page.content = version.content
            page.updated_by = request.user
            page.save(update_fields=["title", "content", "updated_by", "updated_at"])

        return Response(WikiPageDetailSerializer(page).data)


# ---------------------------------------------------------------------------
# WikiPageComment
# ---------------------------------------------------------------------------

class WikiPageCommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /wiki/pages/{page_pk}/comments/"""
    serializer_class = WikiPageCommentSerializer
    permission_classes = [IsAuthenticated]

    def _get_page(self):
        return _get_page(self.kwargs["page_pk"], self.request.user)

    def get_queryset(self):
        page = self._get_page()
        return WikiPageComment.objects.filter(page=page)

    def perform_create(self, serializer):
        page = self._get_page()
        serializer.save(page=page, author=self.request.user)


class WikiPageCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /wiki/comments/{pk}/"""
    serializer_class = WikiPageCommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        try:
            comment = WikiPageComment.objects.select_related("page__space").get(pk=self.kwargs["pk"])
        except WikiPageComment.DoesNotExist:
            raise NotFound("Comentário não encontrado.")
        if not can_read_space(self.request.user, comment.page.space):
            raise NotFound("Comentário não encontrado.")
        if self.request.method in ("PATCH", "DELETE"):
            if comment.author_id != self.request.user.pk and self.request.user.role != "admin":
                raise PermissionDenied("Apenas o autor pode editar/deletar o comentário.")
        return comment


class WikiPageCommentResolveView(APIView):
    """POST /wiki/comments/{pk}/resolve/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            comment = WikiPageComment.objects.select_related("page__space").get(pk=pk)
        except WikiPageComment.DoesNotExist:
            raise NotFound("Comentário não encontrado.")
        if not can_write_space(request.user, comment.page.space):
            raise PermissionDenied("Sem permissão.")
        comment.is_resolved = not comment.is_resolved
        comment.save(update_fields=["is_resolved"])
        return Response(WikiPageCommentSerializer(comment).data)


# ---------------------------------------------------------------------------
# WikiIssueLink
# ---------------------------------------------------------------------------

class WikiIssueLinkListCreateView(generics.ListCreateAPIView):
    """GET/POST /wiki/pages/{page_pk}/issue-links/"""
    serializer_class = WikiIssueLinkSerializer
    permission_classes = [IsAuthenticated]

    def _get_page(self):
        return _get_page(self.kwargs["page_pk"], self.request.user)

    def get_queryset(self):
        return WikiIssueLink.objects.filter(page=self._get_page())

    def perform_create(self, serializer):
        page = self._get_page()
        if not can_write_space(self.request.user, page.space):
            raise PermissionDenied("Sem permissão para criar links neste space.")
        serializer.save(page=page, created_by=self.request.user)


class WikiIssueLinkDestroyView(generics.DestroyAPIView):
    """DELETE /wiki/issue-links/{pk}/"""
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            link = WikiIssueLink.objects.select_related("page__space").get(pk=self.kwargs["pk"])
        except WikiIssueLink.DoesNotExist:
            raise NotFound("Link não encontrado.")
        if not can_write_space(self.request.user, link.page.space):
            raise PermissionDenied("Sem permissão.")
        return link
