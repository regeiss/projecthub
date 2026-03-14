from django.urls import path

from .views import (
    CycleDetailView,
    CycleIssueAddView,
    CycleIssueRemoveView,
    CycleListCreateView,
    CycleProgressView,
)

urlpatterns = [
    # Nested sob /projects/{project_pk}/cycles/ (incluídos em projects/urls.py também)
    # Rotas standalone para operações de issue (sem project_pk)
    path(
        "<uuid:pk>/issues/",
        CycleIssueAddView.as_view(),
        name="cycle-issue-add",
    ),
    path(
        "<uuid:pk>/issues/<uuid:issue_id>/",
        CycleIssueRemoveView.as_view(),
        name="cycle-issue-remove",
    ),
]

# Padrões aninhados expostos para inclusão em projects/urls.py
nested_urlpatterns = [
    path("", CycleListCreateView.as_view(), name="cycle-list"),
    path("<uuid:pk>/", CycleDetailView.as_view(), name="cycle-detail"),
    path("<uuid:pk>/progress/", CycleProgressView.as_view(), name="cycle-progress"),
]
