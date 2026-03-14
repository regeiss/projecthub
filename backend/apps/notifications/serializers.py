from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_detail = WorkspaceMemberSerializer(source="actor", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "type", "entity_type", "entity_id",
            "title", "message", "action_url",
            "is_read", "read_at",
            "actor", "actor_detail",
            "created_at",
        ]
        read_only_fields = [
            "id", "type", "entity_type", "entity_id",
            "title", "message", "action_url",
            "actor", "read_at", "created_at",
        ]
