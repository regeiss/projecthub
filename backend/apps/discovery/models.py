import uuid

from django.db import models


class Idea(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Nova"
        REVIEWING = "reviewing", "Em análise"
        PLANNED = "planned", "Planejada"
        BUILDING = "building", "Em execução"
        SHIPPED = "shipped", "Entregue"
        PARKED = "parked", "Estacionada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="ideas",
    )
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    owner = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_ideas",
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_ideas",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ideas",
    )
    promoted_issue = models.ForeignKey(
        "issues.Issue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_ideas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class IdeaFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Texto"
        NUMBER = "number", "Número"
        SELECT = "select", "Seleção"
        MULTI_SELECT = "multi_select", "Múltipla seleção"
        DATE = "date", "Data"
        USER = "user", "Usuário"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="idea_field_definitions",
    )
    key = models.SlugField(max_length=100)
    label = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=FieldType.choices)
    config = models.JSONField(default=dict, blank=True)
    ordering = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ordering", "label"]
        unique_together = [("workspace", "key")]


class IdeaFieldValue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="field_values")
    field = models.ForeignKey(IdeaFieldDefinition, on_delete=models.CASCADE, related_name="values")
    text_value = models.TextField(blank=True, null=True)
    number_value = models.FloatField(blank=True, null=True)
    date_value = models.DateField(blank=True, null=True)
    user_value = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="idea_field_values",
    )
    json_value = models.JSONField(blank=True, null=True)

    class Meta:
        unique_together = [("idea", "field")]


class IdeaView(models.Model):
    class ViewType(models.TextChoices):
        TABLE = "table", "Tabela"
        BOARD = "board", "Quadro"
        ROADMAP = "roadmap", "Roadmap"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="idea_views",
    )
    owner = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="idea_views",
    )
    name = models.CharField(max_length=255)
    view_type = models.CharField(max_length=20, choices=ViewType.choices)
    filters = models.JSONField(default=dict, blank=True)
    visible_columns = models.JSONField(default=list, blank=True)
    group_by = models.CharField(max_length=100, blank=True, null=True)
    ordering = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]


class IdeaScorecard(models.Model):
    idea = models.OneToOneField(Idea, on_delete=models.CASCADE, related_name="scorecard")
    impact = models.FloatField(default=0)
    effort = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    reach = models.FloatField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def score(self):
        if self.effort <= 0:
            return 0.0
        return round((self.impact * self.confidence) / self.effort, 2)


class IdeaComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="idea_comments",
    )
    body = models.TextField()
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]


class IdeaInsight(models.Model):
    class Kind(models.TextChoices):
        NOTE = "note", "Nota"
        LINK = "link", "Link"
        FEEDBACK = "feedback", "Feedback"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="insights")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NOTE)
    title = models.CharField(max_length=255)
    content = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="idea_insights",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
