from rest_framework import serializers
from .models import Risk


class RiskSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model  = Risk
        fields = [
            "id", "project",
            "title", "description", "category",
            "probability", "impact", "score",
            "status", "response_type",
            "owner", "owner_name",
            "mitigation_plan", "contingency_plan",
            "due_date",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project", "score", "created_by", "created_at", "updated_at"]

    def get_owner_name(self, obj: Risk) -> str | None:
        if obj.owner_id:
            return obj.owner.name
        return None

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
