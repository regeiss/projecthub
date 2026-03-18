from django.urls import path

from .views import (
  WorkspaceDetailView,
  WorkspaceKeycloakUsersView,
  WorkspaceListView,
  WorkspaceMemberCreateView,
  WorkspaceMemberListView,
  WorkspaceMemberUpdateView,
)

urlpatterns = [
  path("", WorkspaceListView.as_view(), name="workspace-list"),
  path("<slug:slug>/", WorkspaceDetailView.as_view(), name="workspace-detail"),
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
    "<slug:slug>/members/create/",
    WorkspaceMemberCreateView.as_view(),
    name="workspace-member-create",
  ),
  path(
    "<slug:slug>/keycloak-users/",
    WorkspaceKeycloakUsersView.as_view(),
    name="workspace-keycloak-users",
  ),
]
