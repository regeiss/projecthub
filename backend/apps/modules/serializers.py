from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import Module, ModuleIssue


class ModuleSerializer(serializers.ModelSerializer):
    lead_detail = WorkspaceMemberSerializer(source="lead", read_only=True)
    issue_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = [
            "id", "project", "name", "description", "status",
            "lead", "lead_detail",
            "start_date", "target_date",
            "issue_count", "completed_count",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project", "created_by", "created_at", "updated_at"]

    def get_issue_count(self, obj):
        return obj.module_issues.count()

    def get_completed_count(self, obj):
        return obj.module_issues.filter(
            issue__state__category="completed"
        ).count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ModuleIssueSerializer(serializers.ModelSerializer):
    issue_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ModuleIssue
        fields = ["module", "issue_id", "added_at"]
        read_only_fields = ["module", "added_at"]
