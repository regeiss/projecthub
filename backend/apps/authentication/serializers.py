from rest_framework import serializers

from apps.workspaces.models import Workspace, WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "logo_url", "created_at", "updated_at"]
        read_only_fields = fields


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    workspace = WorkspaceSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "workspace",
            "email",
            "name",
            "avatar_url",
            "role",
            "is_active",
            "last_login_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
