from django.urls import path
from .views import RiskDetailView, RiskListCreateView

urlpatterns = [
    path("",           RiskListCreateView.as_view(), name="risk-list"),
    path("<uuid:pk>/", RiskDetailView.as_view(),     name="risk-detail"),
]
