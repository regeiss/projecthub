import uuid

from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Ativo"
        PAUSED = "paused", "Pausado"
        COMPLETED = "completed", "Concluído"
        ARCHIVED = "archived", "Arquivado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=10)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=10, blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "projects"
        ordering = ["name"]

    def __str__(self):
        return f"[{self.identifier}] {self.name}"


class ProjectMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrador"
        MEMBER = "member", "Membro"
        VIEWER = "viewer", "Visualizador"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="members"
    )
    member = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.MEMBER
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "project_members"
        unique_together = [("project", "member")]

    def __str__(self):
        return f"{self.member} — {self.project} ({self.role})"


class IssueState(models.Model):
    class Category(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        UNSTARTED = "unstarted", "Não iniciado"
        STARTED = "started", "Em andamento"
        COMPLETED = "completed", "Concluído"
        CANCELLED = "cancelled", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="states"
    )
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=7)
    category = models.CharField(max_length=20, choices=Category.choices)
    sequence = models.IntegerField(db_column="position")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "issue_states"
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.name} ({self.category})"


class Label(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="labels"
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "labels"
        ordering = ["name"]

    def __str__(self):
        return self.name
