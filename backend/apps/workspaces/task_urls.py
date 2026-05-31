from django.urls import path
from .views import PersonalTaskDetailView, PersonalTaskListCreateView

urlpatterns = [
    path("",           PersonalTaskListCreateView.as_view(), name="personal-task-list"),
    path("<uuid:pk>/", PersonalTaskDetailView.as_view(),     name="personal-task-detail"),
]
