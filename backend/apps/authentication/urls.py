from django.urls import path
from .views import MeView, backchannel_logout

urlpatterns = [
    path("me/", MeView.as_view(), name="auth-me"),
    path("logout/backchannel/", backchannel_logout, name="auth-backchannel-logout"),
]
