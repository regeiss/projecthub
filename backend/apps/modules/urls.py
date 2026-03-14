from django.urls import path

from .views import (
    ModuleDetailView,
    ModuleIssueAddView,
    ModuleIssueRemoveView,
    ModuleListCreateView,
)

urlpatterns = [
    # Rotas standalone para operações de issue (sem project_pk)
    path(
        "<uuid:pk>/issues/",
        ModuleIssueAddView.as_view(),
        name="module-issue-add",
    ),
    path(
        "<uuid:pk>/issues/<uuid:issue_id>/",
        ModuleIssueRemoveView.as_view(),
        name="module-issue-remove",
    ),
]

# Padrões aninhados expostos para inclusão em projects/urls.py
nested_urlpatterns = [
    path("", ModuleListCreateView.as_view(), name="module-list"),
    path("<uuid:pk>/", ModuleDetailView.as_view(), name="module-detail"),
]
