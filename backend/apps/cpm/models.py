import uuid

from django.db import models


class CpmIssueData(models.Model):
    """
    Dados CPM calculados para uma issue.
    Atualizado pela task recalculate_cpm após mudanças nas relações.

    ES = Early Start (dias desde o início do projeto)
    EF = Early Finish = ES + duration_days
    LS = Late Start   = LF - duration_days
    LF = Late Finish
    slack = LS - ES  (0 = caminho crítico)
    """

    issue = models.OneToOneField(
        "issues.Issue",
        on_delete=models.CASCADE,
        related_name="cpm_data",
        primary_key=True,
    )
    duration_days = models.IntegerField(default=1)
    es = models.IntegerField(null=True, blank=True)
    ef = models.IntegerField(null=True, blank=True)
    ls = models.IntegerField(null=True, blank=True)
    lf = models.IntegerField(null=True, blank=True)
    slack = models.IntegerField(null=True, blank=True)
    is_critical = models.BooleanField(default=False)
    calculated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = "cpm_issue_data"

    def __str__(self):
        return f"CPM {self.issue_id} (slack={self.slack})"


class CpmBaseline(models.Model):
    """
    Snapshot do estado CPM em um dado momento.
    Permite comparar evolução do cronograma.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="cpm_baselines",
    )
    name = models.CharField(max_length=255)
    snapshot = models.JSONField()  # estado completo: {nodes, critical_path, project_duration}
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "cpm_baselines"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.project} — {self.name}"
