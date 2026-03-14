from django.urls import include, path

from apps.cycles.urls import nested_urlpatterns as cycle_patterns
from apps.modules.urls import nested_urlpatterns as module_patterns

from .views import (
    IssueStateDetailView,
    IssueStateListCreateView,
    LabelDetailView,
    LabelListCreateView,
    ProjectDetailView,
    ProjectListCreateView,
    ProjectMemberDestroyView,
    ProjectMemberListCreateView,
)

urlpatterns = [
    # Projects
    path("", ProjectListCreateView.as_view(), name="project-list"),
    path("<uuid:pk>/", ProjectDetailView.as_view(), name="project-detail"),

    # Members
    path(
        "<uuid:project_pk>/members/",
        ProjectMemberListCreateView.as_view(),
        name="project-member-list",
    ),
    path(
        "<uuid:project_pk>/members/<uuid:pk>/",
        ProjectMemberDestroyView.as_view(),
        name="project-member-detail",
    ),

    # States
    path(
        "<uuid:project_pk>/states/",
        IssueStateListCreateView.as_view(),
        name="issue-state-list",
    ),
    path(
        "<uuid:project_pk>/states/<uuid:pk>/",
        IssueStateDetailView.as_view(),
        name="issue-state-detail",
    ),

    # Labels
    path(
        "<uuid:project_pk>/labels/",
        LabelListCreateView.as_view(),
        name="label-list",
    ),
    path(
        "<uuid:project_pk>/labels/<uuid:pk>/",
        LabelDetailView.as_view(),
        name="label-detail",
    ),

    # Cycles (aninhados)
    path("<uuid:project_pk>/cycles/", include((cycle_patterns, "project-cycles"))),

    # Modules (aninhados)
    path("<uuid:project_pk>/modules/", include((module_patterns, "project-modules"))),

    # Milestones (aninhados)
    path("<uuid:project_pk>/milestones/", include(("apps.milestones.urls", "project-milestones"))),

    # Risks (aninhados)
    path("<uuid:project_pk>/risks/", include(("apps.risks.urls", "project-risks"))),
]
