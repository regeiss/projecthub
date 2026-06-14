from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EpicIssuesView,
    IssueActivityListView,
    IssueAttachmentDestroyView,
    IssueAttachmentListCreateView,
    IssueCommentDetailView,
    IssueCommentListCreateView,
    IssueRelationDestroyView,
    IssueRelationListCreateView,
    IssueSubtaskListCreateView,
    IssueTemplateViewSet,
    IssueViewSet,
    IssueWatchToggleView,
    TimeEntryDetailView,
    TimeEntryListCreateView,
)

router = DefaultRouter()
router.register("", IssueViewSet, basename="issue")

template_router = DefaultRouter()
template_router.register("", IssueTemplateViewSet, basename="issue-template")

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
    path(
        "<uuid:issue_pk>/epic-issues/",
        EpicIssuesView.as_view(),
        name="epic-issues",
    ),
    path(
        "<uuid:issue_pk>/watch/",
        IssueWatchToggleView.as_view(),
        name="issue-watch",
    ),
    path(
        "<uuid:issue_pk>/time-entries/",
        TimeEntryListCreateView.as_view(),
        name="time-entry-list",
    ),
    path(
        "<uuid:issue_pk>/time-entries/<uuid:pk>/",
        TimeEntryDetailView.as_view(),
        name="time-entry-detail",
    ),
    # Router do IssueViewSet (deve vir por último para não capturar os nested)
    path("", include(router.urls)),
]

# Templates URL patterns (registered separately in config/urls.py under /issue-templates/)
template_urlpatterns = [
    path("", include(template_router.urls)),
]
