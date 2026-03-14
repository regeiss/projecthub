from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import CpmBaseline, CpmIssueData


class CpmIssueDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = CpmIssueData
        fields = [
            "id", "issue", "duration_days",
            "es", "ef", "ls", "lf", "slack", "is_critical",
            "calculated_at",
        ]
        read_only_fields = [
            "id", "es", "ef", "ls", "lf", "slack", "is_critical", "calculated_at",
        ]


class CpmIssueDataUpdateSerializer(serializers.ModelSerializer):
    """Usado no PATCH para atualizar somente duration_days."""

    class Meta:
        model = CpmIssueData
        fields = ["duration_days"]


class CpmBaselineSerializer(serializers.ModelSerializer):
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)

    class Meta:
        model = CpmBaseline
        fields = [
            "id", "project", "name", "snapshot",
            "created_by", "created_by_detail", "created_at",
        ]
        read_only_fields = ["id", "project", "snapshot", "created_by", "created_at"]


class CpmResultSerializer(serializers.Serializer):
    """Serializer para o resultado bruto do algoritmo CPM."""
    nodes = serializers.DictField()
    critical_path = serializers.ListField(child=serializers.CharField())
    project_duration = serializers.IntegerField()
    edges = serializers.ListField()
