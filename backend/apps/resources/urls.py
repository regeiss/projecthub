from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ProjectWorkloadView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
    TimeEntryDestroyView,
    TimeEntryListCreateView,
    WorkspaceWorkloadView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
    path('time-entries/', TimeEntryListCreateView.as_view(), name='time-entry-list'),
    path('time-entries/<uuid:pk>/', TimeEntryDestroyView.as_view(), name='time-entry-destroy'),
    path('workload/', WorkspaceWorkloadView.as_view(), name='workspace-workload'),
    path('projects/<uuid:project_pk>/workload/', ProjectWorkloadView.as_view(), name='project-workload'),
]
