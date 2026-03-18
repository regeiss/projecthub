from django.utils.text import slugify

from rest_framework import serializers

from .models import Workspace, WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "logo_url", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "logo_url", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if not attrs.get("slug"):
            base = slugify(attrs["name"])
            slug = base
            n = 1
            while Workspace.objects.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            attrs["slug"] = slug
        return attrs


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


class WorkspaceMemberCreateSerializer(serializers.Serializer):
    keycloak_sub = serializers.CharField(max_length=255)
    email = serializers.EmailField(max_length=255)
    name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=WorkspaceMember.Role.choices)
