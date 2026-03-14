import uuid

from django.db import models


class Cycle(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        ACTIVE = "active", "Ativo"
        COMPLETED = "completed", "Concluído"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="cycles"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_cycles",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "cycles"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.project})"


class CycleIssue(models.Model):
    """Tabela de junção entre Cycle e Issue."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name="cycle_issues")
    issue = models.ForeignKey(
        "issues.Issue", on_delete=models.CASCADE, related_name="cycle_issues"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "cycle_issues"
        unique_together = [("cycle", "issue")]
