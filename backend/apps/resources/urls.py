# backend/apps/resources/urls.py
from django.urls import path
from .views import (
    MemberCapacityDetailView,
    MemberCapacityListCreateView,
    ResourceProfileDetailView,
    ResourceProfileListCreateView,
)

urlpatterns = [
    path('profiles/', ResourceProfileListCreateView.as_view(), name='resource-profile-list'),
    path('profiles/<uuid:pk>/', ResourceProfileDetailView.as_view(), name='resource-profile-detail'),
    path('capacity/', MemberCapacityListCreateView.as_view(), name='member-capacity-list'),
    path('capacity/<uuid:pk>/', MemberCapacityDetailView.as_view(), name='member-capacity-detail'),
]
