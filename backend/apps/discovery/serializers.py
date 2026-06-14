from rest_framework import serializers

from .models import Idea, IdeaComment, IdeaFieldDefinition, IdeaFieldValue, IdeaInsight, IdeaScorecard, IdeaView


class IdeaCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)
    author_avatar = serializers.CharField(source="author.avatar_url", read_only=True, default=None)

    class Meta:
        model = IdeaComment
        fields = ["id", "idea", "author", "author_name", "author_avatar", "body", "is_edited", "created_at", "updated_at"]
        read_only_fields = ["id", "idea", "author", "author_name", "author_avatar", "is_edited", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        instance.is_edited = True
        return super().update(instance, validated_data)


class IdeaFieldValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdeaFieldValue
        fields = [
            "id",
            "field",
            "text_value",
            "number_value",
            "date_value",
            "user_value",
            "json_value",
        ]
        read_only_fields = ["id"]


class IdeaFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdeaFieldDefinition
        fields = [
            "id",
            "workspace",
            "key",
            "label",
            "type",
            "config",
            "ordering",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_at", "updated_at"]


class IdeaViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdeaView
        fields = [
            "id",
            "workspace",
            "owner",
            "name",
            "view_type",
            "filters",
            "visible_columns",
            "group_by",
            "ordering",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "owner", "created_at", "updated_at"]


class IdeaScorecardSerializer(serializers.ModelSerializer):
    score = serializers.FloatField(read_only=True)

    class Meta:
        model = IdeaScorecard
        fields = ["impact", "effort", "confidence", "reach", "score", "updated_at"]
        read_only_fields = ["score", "updated_at"]


class IdeaInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdeaInsight
        fields = ["id", "idea", "kind", "title", "content", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "idea", "created_by", "created_at", "updated_at"]


class IdeaSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True, default=None)
    field_values = IdeaFieldValueSerializer(many=True, required=False)
    scorecard = IdeaScorecardSerializer(read_only=True)

    class Meta:
        model = Idea
        fields = [
            "id",
            "workspace",
            "title",
            "summary",
            "status",
            "owner",
            "owner_name",
            "project",
            "promoted_issue",
            "created_by",
            "field_values",
            "scorecard",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        field_values = validated_data.pop("field_values", [])
        idea = super().create(validated_data)
        self._upsert_field_values(idea, field_values)
        return idea

    def update(self, instance, validated_data):
        field_values = validated_data.pop("field_values", None)
        idea = super().update(instance, validated_data)
        if field_values is not None:
            self._upsert_field_values(idea, field_values)
        return idea

    def _upsert_field_values(self, idea, field_values):
        workspace = idea.workspace
        for field_value in field_values:
            field = field_value["field"]
            if field.workspace_id != workspace.id:
                raise serializers.ValidationError({"field_values": "Field must belong to the same workspace as the idea."})

            defaults = {
                "text_value": field_value.get("text_value"),
                "number_value": field_value.get("number_value"),
                "date_value": field_value.get("date_value"),
                "user_value": field_value.get("user_value"),
                "json_value": field_value.get("json_value"),
            }
            IdeaFieldValue.objects.update_or_create(
                idea=idea,
                field=field,
                defaults=defaults,
            )
