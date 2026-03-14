from rest_framework import serializers

from .models import Workspace, WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "logo_url", "created_at", "updated_at"]
        read_only_fields = fields


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "email",
            "name",
            "avatar_url",
            "role",
            "is_active",
            "last_login_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "email", "name", "avatar_url",
            "is_active", "last_login_at", "created_at", "updated_at",
        ]


class WorkspaceMemberRoleSerializer(serializers.ModelSerializer):
    """Usado no PATCH /workspaces/{slug}/members/{id}/ — somente papel."""

    class Meta:
        model = WorkspaceMember
        fields = ["role"]
