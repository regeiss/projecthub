from django.db import connection
from rest_framework import serializers

from apps.projects.models import Label
from apps.projects.serializers import IssueStateSerializer, LabelSerializer
from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import (
    Issue,
    IssueActivity,
    IssueAttachment,
    IssueComment,
    IssueRelation,
)


class SubtaskSerializer(serializers.ModelSerializer):
  """Slim read-only serializer for subtask list responses."""
  state_color = serializers.CharField(source="state.color", read_only=True)
  state_category = serializers.CharField(source="state.category", read_only=True)
  assignee_name = serializers.CharField(
    source="assignee.name", read_only=True, default=None
  )
  assignee_avatar = serializers.CharField(
    source="assignee.avatar_url", read_only=True, default=None
  )

  class Meta:
    model = Issue
    fields = [
      "id", "sequence_id", "title",
      "state", "state_color", "state_category",
      "assignee", "assignee_name", "assignee_avatar",
      "priority", "type", "completed_at",
    ]
    read_only_fields = fields


class IssueSerializer(serializers.ModelSerializer):
    # Campos de leitura expandidos (flat, alinhado com FRONTEND.md)
    state_name = serializers.CharField(source="state.name", read_only=True)
    state_color = serializers.CharField(source="state.color", read_only=True)
    state_category = serializers.CharField(source="state.category", read_only=True)
    project_identifier = serializers.CharField(
        source="project.identifier", read_only=True
    )
    project_name = serializers.CharField(
        source="project.name", read_only=True
    )
    assignee_name = serializers.CharField(
        source="assignee.name", read_only=True, default=None
    )
    assignee_avatar = serializers.CharField(
        source="assignee.avatar_url", read_only=True, default=None
    )
    reporter_name = serializers.CharField(source="reporter.name", read_only=True)

    cycle_id = serializers.SerializerMethodField()
    cycle_name = serializers.SerializerMethodField()

    milestone_name = serializers.SerializerMethodField()
    subtask_count = serializers.SerializerMethodField()
    completed_subtask_count = serializers.SerializerMethodField()

    def get_cycle_id(self, obj):
        from apps.cycles.models import CycleIssue
        ci = CycleIssue.objects.filter(issue=obj).select_related('cycle').first()
        return str(ci.cycle_id) if ci else None

    def get_cycle_name(self, obj):
        from apps.cycles.models import CycleIssue
        ci = CycleIssue.objects.filter(issue=obj).select_related('cycle').first()
        return ci.cycle.name if ci else None

    def get_milestone_name(self, obj) -> str | None:
        return obj.milestone.name if obj.milestone_id else None

    def get_subtask_count(self, obj):
        if hasattr(obj, 'subtask_count'):
            return obj.subtask_count
        return obj.sub_issues.count()

    def get_completed_subtask_count(self, obj):
        if hasattr(obj, 'completed_subtask_count'):
            return obj.completed_subtask_count
        return obj.sub_issues.filter(state__category='completed').count()

    # Labels: leitura como objetos, escrita como lista de IDs
    labels = LabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        source="labels",
        required=False,
        queryset=Label.objects.all(),
    )

    class Meta:
        model = Issue
        fields = [
            "id",
            "sequence_id",
            "project",
            "project_identifier",
            "project_name",
            "title",
            "description",
            "state",
            "state_name",
            "state_color",
            "state_category",
            "priority",
            "type",
            "assignee",
            "assignee_name",
            "assignee_avatar",
            "reporter",
            "reporter_name",
            "parent",
            "epic",
            "estimate_points",
            "size",
            "estimate_days",
            "start_date",
            "due_date",
            "completed_at",
            "sort_order",
            "labels",
            "label_ids",
            "cycle_id",
            "cycle_name",
            "milestone",
            "milestone_name",
            "created_by",
            "created_at",
            "updated_at",
            "subtask_count",
            "completed_subtask_count",
        ]
        read_only_fields = [
            "id", "sequence_id", "project", "project_identifier", "project_name",
            "state_name", "state_color", "state_category",
            "assignee_name", "assignee_avatar", "reporter", "reporter_name",
            "labels", "completed_at", "cycle_id", "cycle_name",
            "milestone_name",
            "created_by", "created_at", "updated_at",
            "subtask_count", "completed_subtask_count",
        ]

    @staticmethod
    def _set_labels(issue_id, labels):
        """Sync issue_labels via raw SQL (table has no id column)."""
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM issue_labels WHERE issue_id = %s", [issue_id])
            if labels:
                cursor.executemany(
                    "INSERT INTO issue_labels (issue_id, label_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [(issue_id, label.id) for label in labels],
                )

    def create(self, validated_data):
        labels = validated_data.pop("labels", [])
        request = self.context["request"]
        validated_data["reporter"] = request.user
        validated_data["created_by"] = request.user
        issue = Issue.objects.create(**validated_data)
        self._set_labels(issue.id, labels)
        return issue

    def update(self, instance, validated_data):
        labels = validated_data.pop("labels", None)
        # Passa actor para o signal
        instance._actor = self.context["request"].user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if labels is not None:
            self._set_labels(instance.id, labels)
        return instance


class IssueStateUpdateSerializer(serializers.Serializer):
    """Para PATCH /issues/{id}/state/"""
    state_id = serializers.UUIDField()
    sort_order = serializers.FloatField()


class IssueCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)
    author_avatar = serializers.CharField(
        source="author.avatar_url", read_only=True, default=None
    )

    class Meta:
        model = IssueComment
        fields = [
            "id", "issue", "author", "author_name", "author_avatar",
            "content", "is_edited", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "issue", "author", "author_name", "author_avatar",
            "is_edited", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance.is_edited = True
        return super().update(instance, validated_data)


class IssueActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source="actor.name", read_only=True, default=None
    )
    actor_avatar = serializers.CharField(
        source="actor.avatar_url", read_only=True, default=None
    )

    class Meta:
        model = IssueActivity
        fields = [
            "id", "issue", "actor", "actor_name", "actor_avatar",
            "verb", "field", "old_value", "new_value",
            "old_identifier", "new_identifier", "created_at",
        ]
        read_only_fields = fields


class IssueAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.name", read_only=True
    )

    class Meta:
        model = IssueAttachment
        fields = [
            "id", "issue", "uploaded_by", "uploaded_by_name",
            "filename", "file_size", "mime_type", "storage_path", "created_at",
        ]
        read_only_fields = [
            "id", "issue", "uploaded_by", "uploaded_by_name", "created_at",
        ]


class IssueRelationSerializer(serializers.ModelSerializer):
  related_issue_title = serializers.CharField(
    source='related_issue.title', read_only=True
  )
  related_issue_sequence_id = serializers.IntegerField(
    source='related_issue.sequence_id', read_only=True
  )
  related_issue_project_id = serializers.UUIDField(
    source='related_issue.project_id', read_only=True
  )
  related_issue_project_name = serializers.CharField(
    source='related_issue.project.name', read_only=True
  )

  class Meta:
    model = IssueRelation
    fields = [
      'id', 'issue', 'related_issue',
      'related_issue_title', 'related_issue_sequence_id',
      'related_issue_project_id', 'related_issue_project_name',
      'relation_type', 'lag_days', 'created_at',
    ]
    read_only_fields = [
      'id', 'issue', 'created_at',
      'related_issue_title', 'related_issue_sequence_id',
      'related_issue_project_id', 'related_issue_project_name',
    ]

  def validate(self, attrs):
    issue_pk = self.context['view'].kwargs.get('issue_pk')
    related = attrs.get('related_issue')
    relation_type = attrs.get('relation_type')
    if related and str(related.pk) == str(issue_pk):
      raise serializers.ValidationError(
        'Uma issue não pode se relacionar consigo mesma.'
      )
    if related and relation_type and issue_pk:
      exists = IssueRelation.objects.filter(
        issue_id=issue_pk,
        related_issue=related,
        relation_type=relation_type,
      ).exists()
      if exists:
        raise serializers.ValidationError(
          'Esta relação já existe.'
        )
    return attrs

  def create(self, validated_data):
    return super().create(validated_data)
