import uuid

from django.db import models


class Module(models.Model):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        IN_PROGRESS = "in-progress", "Em andamento"
        PAUSED = "paused", "Pausado"
        COMPLETED = "completed", "Concluído"
        CANCELLED = "cancelled", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="modules"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.BACKLOG
    )
    lead = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_modules",
    )
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_modules",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "modules"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.project})"


class ModuleIssue(models.Model):
    """Tabela de junção entre Module e Issue."""
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name="module_issues"
    )
    issue = models.ForeignKey(
        "issues.Issue", on_delete=models.CASCADE, related_name="module_issues"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "module_issues"
        unique_together = [("module", "issue")]
