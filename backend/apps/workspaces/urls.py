from django.urls import path

from .views import (
    AccessRequestCreateView,
    MyAccessRequestListView,
    WorkspaceDetailView,
    WorkspaceAccessRequestListView,
    WorkspaceAccessRequestResolveView,
    WorkspaceKeycloakUsersView,
    WorkspaceListView,
    WorkspaceMemberCreateView,
    WorkspaceMemberListView,
    WorkspaceMemberUpdateView,
)

urlpatterns = [
    path("access-requests/", AccessRequestCreateView.as_view(), name="access-request-create"),
    path("access-requests/me/", MyAccessRequestListView.as_view(), name="access-request-mine"),
    path("", WorkspaceListView.as_view(), name="workspace-list"),
    path("<slug:slug>/", WorkspaceDetailView.as_view(), name="workspace-detail"),
    path(
        "<slug:slug>/access-requests/",
        WorkspaceAccessRequestListView.as_view(),
        name="workspace-access-request-list",
    ),
    path(
        "<slug:slug>/access-requests/<uuid:pk>/resolve/",
        WorkspaceAccessRequestResolveView.as_view(),
        name="workspace-access-request-resolve",
    ),
    path(
        "<slug:slug>/members/",
        WorkspaceMemberListView.as_view(),
        name="workspace-member-list",
    ),
    path(
        "<slug:slug>/members/<uuid:pk>/",
        WorkspaceMemberUpdateView.as_view(),
        name="workspace-member-update",
    ),
    path(
        "<slug:slug>/keycloak-users/",
        WorkspaceKeycloakUsersView.as_view(),
        name="workspace-keycloak-users",
    ),
    path(
        "<slug:slug>/members/create/",
        WorkspaceMemberCreateView.as_view(),
        name="workspace-member-create",
    ),
]
