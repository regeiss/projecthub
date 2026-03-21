from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    IssueActivityListView,
    IssueAttachmentDestroyView,
    IssueAttachmentListCreateView,
    IssueCommentDetailView,
    IssueCommentListCreateView,
    IssueRelationDestroyView,
    IssueRelationListCreateView,
    IssueSubtaskListCreateView,
    IssueViewSet,
)

router = DefaultRouter()
router.register("", IssueViewSet, basename="issue")

urlpatterns = [
    # Nested resources sob /issues/{issue_pk}/
    path(
        "<uuid:issue_pk>/comments/",
        IssueCommentListCreateView.as_view(),
        name="issue-comment-list",
    ),
    path(
        "<uuid:issue_pk>/comments/<uuid:pk>/",
        IssueCommentDetailView.as_view(),
        name="issue-comment-detail",
    ),
    path(
        "<uuid:issue_pk>/activities/",
        IssueActivityListView.as_view(),
        name="issue-activity-list",
    ),
    path(
        "<uuid:issue_pk>/attachments/",
        IssueAttachmentListCreateView.as_view(),
        name="issue-attachment-list",
    ),
    path(
        "<uuid:issue_pk>/attachments/<uuid:pk>/",
        IssueAttachmentDestroyView.as_view(),
        name="issue-attachment-detail",
    ),
    path(
        "<uuid:issue_pk>/relations/",
        IssueRelationListCreateView.as_view(),
        name="issue-relation-list",
    ),
    path(
        "<uuid:issue_pk>/relations/<uuid:pk>/",
        IssueRelationDestroyView.as_view(),
        name="issue-relation-detail",
    ),
    path(
        "<uuid:issue_pk>/subtasks/",
        IssueSubtaskListCreateView.as_view(),
        name="issue-subtask-list",
    ),
    # Router do IssueViewSet (deve vir por último para não capturar os nested)
    path("", include(router.urls)),
]
