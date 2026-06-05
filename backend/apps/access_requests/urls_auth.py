from django.urls import path
from .views import AccessRequestSubmitView, AccessRequestStatusView

urlpatterns = [
    path("", AccessRequestSubmitView.as_view(), name="access-request-submit"),
    path("me/", AccessRequestStatusView.as_view(), name="access-request-status"),
]
