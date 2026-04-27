from decimal import Decimal

from rest_framework import serializers

from .models import (
    Cycle,
    CycleIssue,
    SprintPlan,
    SprintPlanAllocation,
    SprintPlanMemberCapacity,
)


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


class SprintPlanMemberCapacitySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.name", read_only=True)
    member_avatar = serializers.CharField(source="member.avatar_url", read_only=True)

    class Meta:
        model = SprintPlanMemberCapacity
        fields = [
            "id",
            "member",
            "member_name",
            "member_avatar",
            "default_days",
            "override_days",
            "note",
        ]


class SprintPlanAllocationSerializer(serializers.ModelSerializer):
    issue_title = serializers.CharField(source="issue.title", read_only=True)
    issue_sequence_id = serializers.IntegerField(source="issue.sequence_id", read_only=True)
    planned_days = serializers.DecimalField(
        max_digits=7,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0"),
    )
    planned_story_points = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )

    class Meta:
        model = SprintPlanAllocation
        fields = [
            "id",
            "issue",
            "issue_title",
            "issue_sequence_id",
            "planned_member",
            "planned_days",
            "planned_story_points",
            "rank",
            "note",
        ]


class SprintPlanSerializer(serializers.ModelSerializer):
    member_capacities = SprintPlanMemberCapacitySerializer(many=True, read_only=True)
    allocations = SprintPlanAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = SprintPlan
        fields = [
            "id",
            "cycle",
            "status",
            "applied_at",
            "member_capacities",
            "allocations",
        ]
