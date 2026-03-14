from rest_framework import serializers

from apps.issues.serializers import IssueSerializer

from .models import Cycle, CycleIssue


class CycleSerializer(serializers.ModelSerializer):
    issue_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Cycle
        fields = [
            "id", "project", "name", "description",
            "start_date", "end_date", "status",
            "issue_count", "completed_count",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project", "created_by", "created_at", "updated_at"]

    def get_issue_count(self, obj):
        return obj.cycle_issues.count()

    def get_completed_count(self, obj):
        return obj.cycle_issues.filter(
            issue__state__category="completed"
        ).count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class CycleIssueSerializer(serializers.ModelSerializer):
    issue_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = CycleIssue
        fields = ["cycle", "issue_id", "added_at"]
        read_only_fields = ["cycle", "added_at"]


class CycleProgressSerializer(serializers.Serializer):
    """Dados de progresso do cycle: GET /cycles/{id}/progress/"""
    total = serializers.IntegerField()
    completed = serializers.IntegerField()
    started = serializers.IntegerField()
    backlog = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    completion_rate = serializers.FloatField()
