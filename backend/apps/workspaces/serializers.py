from django.utils.text import slugify

from rest_framework import serializers

from .models import AccessRequest, PersonalTask, Workspace, WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "logo_url", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkspaceUpdateSerializer(serializers.ModelSerializer):
    """PATCH /workspaces/{slug}/ — somente nome e logo."""
    class Meta:
        model = Workspace
        fields = ["id", "name", "logo_url", "created_at", "updated_at"]
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


class PersonalTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalTask
        fields = ["id", "title", "done", "sort_order", "created_at"]
        read_only_fields = ["id", "created_at"]


class AccessRequestSerializer(serializers.ModelSerializer):
    workspace_name = serializers.SerializerMethodField()

    class Meta:
        model = AccessRequest
        fields = [
            "id",
            "status",
            "workspace",
            "workspace_name",
            "denial_reason",
            "requested_at",
            "resolved_at",
            "keycloak_sub",
            "email",
            "name",
            "secretaria",
            "reason",
            "resolved_by",
            "previous_denial_count",
        ]
        read_only_fields = fields

    def get_workspace_name(self, obj):
        return obj.workspace.name if obj.workspace_id else obj.workspace_name


class AccessRequestCreateSerializer(serializers.Serializer):
    secretaria = serializers.CharField(max_length=255)
    workspace_name = serializers.CharField(max_length=255)
    reason = serializers.CharField(allow_blank=True)


class AccessRequestResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "deny"])
    extra_workspace_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices,
        required=False,
    )
    denial_reason = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        action = attrs["action"]
        if action == "approve" and not attrs.get("role"):
            raise serializers.ValidationError({"role": "Este campo é obrigatório para aprovar."})
        if action == "deny" and not attrs.get("denial_reason"):
            raise serializers.ValidationError({"denial_reason": "Este campo é obrigatório para negar."})
        return attrs
