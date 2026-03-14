from django_filters import rest_framework as filters

from .models import Project


class ProjectFilter(filters.FilterSet):
    class Meta:
        model = Project
        fields = ["status", "is_private"]
