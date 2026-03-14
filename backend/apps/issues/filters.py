from django_filters import rest_framework as filters

from apps.projects.models import Label

from .models import Issue


class IssueFilter(filters.FilterSet):
    project_id = filters.UUIDFilter(field_name="project_id")
    state_id = filters.UUIDFilter(field_name="state_id")
    assignee_id = filters.UUIDFilter(field_name="assignee_id")
    reporter_id = filters.UUIDFilter(field_name="reporter_id")
    priority = filters.MultipleChoiceFilter(choices=Issue.Priority.choices)
    type = filters.MultipleChoiceFilter(choices=Issue.Type.choices)
    label = filters.ModelMultipleChoiceFilter(
        field_name="labels",
        queryset=Label.objects.all(),
        conjoined=False,
    )
    created_after = filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    updated_after = filters.DateTimeFilter(
        field_name="updated_at", lookup_expr="gte"
    )
    has_due_date = filters.BooleanFilter(
        field_name="due_date", lookup_expr="isnull", exclude=True
    )

    class Meta:
        model = Issue
        fields = [
            "project_id", "state_id", "assignee_id", "reporter_id",
            "priority", "type",
        ]
