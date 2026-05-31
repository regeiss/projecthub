from django.urls import path

from .views import (
    CpmBaselineDetailView,
    CpmBaselineListCreateView,
    CpmCalculateView,
    CpmGanttView,
    CpmIssueDataUpdateView,
    CpmNetworkView,
    CpmProjectDataView,
)

urlpatterns = [
    # Dados CPM do projeto
    path("projects/<uuid:project_pk>/", CpmProjectDataView.as_view(), name="cpm-project-data"),

    # Atualizar duration de uma issue
    path(
        "projects/<uuid:project_pk>/issues/<uuid:issue_pk>/",
        CpmIssueDataUpdateView.as_view(),
        name="cpm-issue-data-update",
    ),

    # Forçar recálculo síncrono + disparo de task assíncrona
    path(
        "projects/<uuid:project_pk>/calculate/",
        CpmCalculateView.as_view(),
        name="cpm-calculate",
    ),

    # Grafo React Flow
    path("projects/<uuid:project_pk>/network/", CpmNetworkView.as_view(), name="cpm-network"),

    # Gantt
    path("projects/<uuid:project_pk>/gantt/", CpmGanttView.as_view(), name="cpm-gantt"),

    # Baselines
    path(
        "projects/<uuid:project_pk>/baselines/",
        CpmBaselineListCreateView.as_view(),
        name="cpm-baseline-list",
    ),
    path(
        "projects/<uuid:project_pk>/baselines/<uuid:baseline_pk>/",
        CpmBaselineDetailView.as_view(),
        name="cpm-baseline-detail",
    ),
]
