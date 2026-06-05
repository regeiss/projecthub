from django.urls import path
from .views import AdminAccessRequestListView, AdminAccessRequestResolveView

urlpatterns = [
    path(
        "<slug:slug>/access-requests/",
        AdminAccessRequestListView.as_view(),
        name="workspace-access-request-list",
    ),
    path(
        "<slug:slug>/access-requests/<uuid:pk>/",
        AdminAccessRequestResolveView.as_view(),
        name="workspace-access-request-resolve",
    ),
]
