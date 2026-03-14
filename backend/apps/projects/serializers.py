from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import IssueState, Label, Project, ProjectMember


_DEFAULT_STATES = [
    {"name": "Backlog",       "color": "#6B7280", "category": "backlog",    "sequence": 0, "is_default": False},
    {"name": "A fazer",       "color": "#3B82F6", "category": "unstarted",  "sequence": 1, "is_default": True},
    {"name": "Em andamento",  "color": "#F59E0B", "category": "started",    "sequence": 2, "is_default": False},
    {"name": "Em revisão",    "color": "#8B5CF6", "category": "started",    "sequence": 3, "is_default": False},
    {"name": "Concluído",     "color": "#10B981", "category": "completed",  "sequence": 4, "is_default": False},
    {"name": "Cancelado",     "color": "#EF4444", "category": "cancelled",  "sequence": 5, "is_default": False},
]


def _seed_default_states(project):
    from .models import IssueState
    IssueState.objects.bulk_create([
        IssueState(project=project, **s) for s in _DEFAULT_STATES
    ])


def _seed_wiki_space(project, created_by):
    from apps.wiki.models import WikiSpace
    WikiSpace.objects.create(
        workspace=project.workspace,
        project=project,
        name=project.name,
        created_by=created_by,
    )


class IssueStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueState
        fields = [
            "id", "project", "name", "color", "category",
            "sequence", "is_default", "created_at",
        ]
        read_only_fields = ["id", "project", "created_at"]


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ["id", "project", "name", "color", "created_at"]
        read_only_fields = ["id", "project", "created_at"]


class ProjectMemberSerializer(serializers.ModelSerializer):
    member_detail = WorkspaceMemberSerializer(source="member", read_only=True)
    member_id = serializers.UUIDField(write_only=True, source="member.id")

    class Meta:
        model = ProjectMember
        fields = [
            "id", "project", "member_id", "member_detail",
            "role", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project", "created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "workspace", "name", "identifier", "description",
            "icon", "color", "status", "is_private",
            "created_by", "member_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_by", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.members.count()

    def validate_identifier(self, value):
        value = value.upper()
        workspace = self.context["request"].user.workspace
        qs = Project.objects.filter(workspace=workspace, identifier=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Já existe um projeto com este identificador neste workspace.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["workspace"] = request.user.workspace
        validated_data["created_by"] = request.user
        project = super().create(validated_data)

        ProjectMember.objects.create(
            project=project,
            member=request.user,
            role=ProjectMember.Role.ADMIN,
        )

        _seed_default_states(project)
        _seed_wiki_space(project, request.user)
        return project
