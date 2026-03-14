from django_filters import rest_framework as filters

from .models import WorkspaceMember


class WorkspaceMemberFilter(filters.FilterSet):
    role = filters.ChoiceFilter(choices=WorkspaceMember.Role.choices)

    class Meta:
        model = WorkspaceMember
        fields = ["role", "is_active"]
