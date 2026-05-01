from django.urls import path

from .views import (
    CycleDetailView,
    CycleIssueAddView,
    CycleIssueRemoveView,
    CycleListCreateView,
    CycleProgressView,
    SprintPlanAllocationDetailView,
    SprintPlanAllocationListCreateView,
    SprintPlanApplyView,
    SprintPlanMemberCapacityListView,
    SprintPlanView,
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
    path("<uuid:pk>/plan/", SprintPlanView.as_view(), name="cycle-plan"),
    path(
        "<uuid:pk>/plan/member-capacities/",
        SprintPlanMemberCapacityListView.as_view(),
        name="cycle-plan-member-capacity-list",
    ),
    path(
        "<uuid:pk>/plan/allocations/",
        SprintPlanAllocationListCreateView.as_view(),
        name="cycle-plan-allocation-list",
    ),
    path(
        "<uuid:pk>/plan/allocations/<uuid:allocation_pk>/",
        SprintPlanAllocationDetailView.as_view(),
        name="cycle-plan-allocation-detail",
    ),
    path("<uuid:pk>/plan/apply/", SprintPlanApplyView.as_view(), name="cycle-plan-apply"),
]
