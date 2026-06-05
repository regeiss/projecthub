from rest_framework import serializers
from .models import AccessRequest


class AccessRequestSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(read_only=True)

    class Meta:
        model = AccessRequest
        fields = [
            "id", "status", "workspace_name", "denial_reason",
            "requested_at", "resolved_at",
        ]
        read_only_fields = fields


class AccessRequestDetailSerializer(serializers.ModelSerializer):
    previous_denial_count = serializers.SerializerMethodField()

    class Meta:
        model = AccessRequest
        fields = [
            "id", "keycloak_sub", "email", "name", "workspace", "workspace_name",
            "secretaria", "reason", "status", "denial_reason",
            "requested_at", "resolved_at", "resolved_by",
            "previous_denial_count",
        ]

    def get_previous_denial_count(self, obj):
        count = 0
        cur = obj.previous_request
        while cur is not None:
            count += 1
            cur = cur.previous_request
        return count


class AdminResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "deny"])
    extra_workspace_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list,
    )
    denial_reason = serializers.CharField(required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=["admin", "member", "guest"], required=False, default="member",
    )

    def validate(self, data):
        if data["action"] == "deny" and not data.get("denial_reason", "").strip():
            raise serializers.ValidationError(
                {"denial_reason": "Motivo de negação é obrigatório."}
            )
        return data
