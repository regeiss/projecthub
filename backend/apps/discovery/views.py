from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.issues.models import Issue

from .models import Idea, IdeaComment, IdeaFieldDefinition, IdeaInsight, IdeaScorecard, IdeaView
from .permissions import IsWorkspaceMember
from .serializers import (
    IdeaCommentSerializer,
    IdeaFieldDefinitionSerializer,
    IdeaInsightSerializer,
    IdeaScorecardSerializer,
    IdeaSerializer,
    IdeaViewSerializer,
)


class IdeaViewSet(ModelViewSet):
    serializer_class = IdeaSerializer
    permission_classes = [IsWorkspaceMember]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return (
            Idea.objects.select_related("owner", "created_by", "project", "promoted_issue", "scorecard")
            .prefetch_related("field_values__field", "field_values__user_value")
            .filter(workspace=self.request.user.workspace)
        )

    def perform_create(self, serializer):
        serializer.save(
            workspace=self.request.user.workspace,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["patch"], url_path="scorecard")
    def scorecard(self, request, pk=None):
        idea = self.get_object()
        scorecard, _ = IdeaScorecard.objects.get_or_create(idea=idea)
        serializer = IdeaScorecardSerializer(scorecard, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        idea = self.get_object()
        if request.method == "GET":
            qs = IdeaComment.objects.select_related("author").filter(idea=idea)
            return Response(IdeaCommentSerializer(qs, many=True).data)
        serializer = IdeaCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(idea=idea, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path="comments/(?P<comment_pk>[^/.]+)")
    def comment_detail(self, request, pk=None, comment_pk=None):
        idea = self.get_object()
        comment = IdeaComment.objects.get(pk=comment_pk, idea=idea)
        if comment.author != request.user and request.user.role != "admin":
            return Response({"detail": "Sem permissão."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "DELETE":
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = IdeaCommentSerializer(comment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="insights")
    def insights(self, request, pk=None):
        idea = self.get_object()
        if request.method == "GET":
            qs = IdeaInsight.objects.filter(idea=idea)
            return Response(IdeaInsightSerializer(qs, many=True).data)
        serializer = IdeaInsightSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(idea=idea, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="promote")
    def promote(self, request, pk=None):
        idea = self.get_object()
        if not idea.project:
            return Response(
                {"detail": "Idea must be linked to a project before promotion."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        default_state = (
            idea.project.states.filter(is_default=True).first()
            or idea.project.states.first()
        )
        if not default_state:
            return Response(
                {"detail": "Project has no issue states configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        issue = Issue.objects.create(
            project=idea.project,
            title=idea.title,
            description={"type": "doc", "content": []},
            state=default_state,
            reporter=request.user,
            created_by=request.user,
        )
        idea.promoted_issue = issue
        idea.save(update_fields=["promoted_issue", "updated_at"])
        return Response(self.get_serializer(idea).data, status=status.HTTP_201_CREATED)


class IdeaFieldDefinitionViewSet(ModelViewSet):
    serializer_class = IdeaFieldDefinitionSerializer
    permission_classes = [IsWorkspaceMember]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return IdeaFieldDefinition.objects.filter(workspace=self.request.user.workspace)

    def perform_create(self, serializer):
        serializer.save(workspace=self.request.user.workspace)


class IdeaViewViewSet(ModelViewSet):
    serializer_class = IdeaViewSerializer
    permission_classes = [IsWorkspaceMember]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return IdeaView.objects.filter(workspace=self.request.user.workspace)

    def perform_create(self, serializer):
        serializer.save(
            workspace=self.request.user.workspace,
            owner=self.request.user,
        )
