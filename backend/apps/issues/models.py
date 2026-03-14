import uuid

from django.db import models


class Issue(models.Model):
    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgente"
        HIGH = "high", "Alta"
        MEDIUM = "medium", "Média"
        LOW = "low", "Baixa"
        NONE = "none", "Nenhuma"

    class Type(models.TextChoices):
        TASK = "task", "Tarefa"
        BUG = "bug", "Bug"
        STORY = "story", "História"
        EPIC = "epic", "Épico"
        SUBTASK = "subtask", "Sub-tarefa"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence_id = models.IntegerField(null=True, blank=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="issues"
    )
    title = models.CharField(max_length=500)
    description = models.JSONField(null=True, blank=True)  # TipTap JSON
    state = models.ForeignKey(
        "projects.IssueState", on_delete=models.PROTECT, related_name="issues"
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NONE
    )
    type = models.CharField(
        max_length=10, choices=Type.choices, default=Type.TASK
    )
    assignee = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_issues",
    )
    reporter = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="reported_issues",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_issues",
    )
    epic = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="epic_issues",
    )
    class Size(models.TextChoices):
        XS = 'xs', 'XS'
        S  = 's',  'S'
        M  = 'm',  'M'
        L  = 'l',  'L'
        XL = 'xl', 'XL'

    estimate_points = models.IntegerField(null=True, blank=True)
    size = models.CharField(max_length=5, choices=Size.choices, null=True, blank=True)
    estimate_days = models.FloatField(null=True, blank=True)
    milestone = models.ForeignKey(
        'milestones.Milestone',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issues',
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    sort_order = models.FloatField(default=65535.0)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_issues",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    labels = models.ManyToManyField(
        "projects.Label",
        through="IssueLabel",
        related_name="issues",
        blank=True,
    )

    class Meta:
        managed = True
        db_table = "issues"
        ordering = ["sort_order"]

    def __str__(self):
        return f"[{self.project.identifier}-{self.sequence_id}] {self.title}"

    def save(self, *args, **kwargs):
        if self._state.adding and not self.sequence_id:
            from django.db import connection

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT next_sequence_id(%s)", [str(self.project_id)]
                )
                self.sequence_id = cursor.fetchone()[0]
        super().save(*args, **kwargs)


class IssueLabel(models.Model):
    """Tabela de junção entre Issue e Label (managed=False)."""
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE)
    label = models.ForeignKey("projects.Label", on_delete=models.CASCADE)

    class Meta:
        managed = True
        db_table = "issue_labels"
        unique_together = [("issue", "label")]


class IssueRelation(models.Model):
    class RelationType(models.TextChoices):
        BLOCKS = "blocks", "Bloqueia"
        BLOCKED_BY = "blocked_by", "Bloqueado por"
        DUPLICATES = "duplicates", "Duplica"
        DUPLICATE_OF = "duplicate_of", "Duplicata de"
        RELATES_TO = "relates_to", "Relacionado a"
        FINISH_TO_START = "finish_to_start", "Termina para iniciar"
        START_TO_START = "start_to_start", "Inicia para iniciar"
        FINISH_TO_FINISH = "finish_to_finish", "Termina para terminar"
        START_TO_FINISH = "start_to_finish", "Inicia para terminar"

    CPM_TYPES = frozenset(
        ["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="relations")
    related_issue = models.ForeignKey(
        Issue, on_delete=models.CASCADE, related_name="reverse_relations",
        db_column="related_id"
    )
    relation_type = models.CharField(max_length=30, choices=RelationType.choices)
    lag_days = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "issue_relations"
        unique_together = [("issue", "related_issue", "relation_type")]

    def __str__(self):
        return f"{self.issue} {self.relation_type} {self.related_issue}"


class IssueComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="issue_comments",
    )
    content = models.JSONField()  # TipTap JSON
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "issue_comments"
        ordering = ["created_at"]


class IssueActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        Issue, on_delete=models.CASCADE, related_name="activities"
    )
    actor = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issue_activities",
    )
    verb = models.CharField(max_length=50, db_column="activity_type")
    field = models.CharField(max_length=100, null=True, blank=True)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    old_identifier = models.CharField(max_length=255, null=True, blank=True)
    new_identifier = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "issue_activities"
        ordering = ["-created_at"]


class IssueAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        Issue, on_delete=models.CASCADE, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT, db_column="uploaded_by"
    )
    filename = models.CharField(max_length=255, db_column="file_name")
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    storage_path = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "issue_attachments"
        ordering = ["-created_at"]
