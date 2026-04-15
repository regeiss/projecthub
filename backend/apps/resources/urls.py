from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
    TimeEntryDestroyView,
    TimeEntryListCreateView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
    path('time-entries/', TimeEntryListCreateView.as_view(), name='time-entry-list'),
    path('time-entries/<uuid:pk>/', TimeEntryDestroyView.as_view(), name='time-entry-destroy'),
]
