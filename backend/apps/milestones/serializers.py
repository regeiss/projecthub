from rest_framework import serializers

from .models import Milestone


class MilestoneSerializer(serializers.ModelSerializer):
    issue_count      = serializers.SerializerMethodField()
    completed_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Milestone
        fields = [
            'id', 'project', 'name', 'description', 'due_date', 'status',
            'issue_count', 'completed_count',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'project', 'created_by', 'created_at', 'updated_at',
        ]

    def get_issue_count(self, obj: Milestone) -> int:
        return obj.issues.count()

    def get_completed_count(self, obj: Milestone) -> int:
        return obj.issues.filter(state__category='completed').count()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
