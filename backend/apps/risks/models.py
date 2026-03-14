import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Risk(models.Model):
    class Category(models.TextChoices):
        TECHNICAL   = "technical",   "Técnico"
        SCHEDULE    = "schedule",    "Prazo"
        COST        = "cost",        "Custo"
        RESOURCE    = "resource",    "Recurso"
        EXTERNAL    = "external",    "Externo"
        STAKEHOLDER = "stakeholder", "Stakeholder"

    class Status(models.TextChoices):
        IDENTIFIED = "identified", "Identificado"
        ANALYZING  = "analyzing",  "Em análise"
        MITIGATING = "mitigating", "Mitigando"
        MONITORING = "monitoring", "Monitorando"
        CLOSED     = "closed",     "Fechado"
        ACCEPTED   = "accepted",   "Aceito"
        OCCURRED   = "occurred",   "Ocorreu"

    class ResponseType(models.TextChoices):
        AVOID    = "avoid",    "Evitar"
        TRANSFER = "transfer", "Transferir"
        MITIGATE = "mitigate", "Mitigar"
        ACCEPT   = "accept",   "Aceitar"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project          = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="risks")
    title            = models.CharField(max_length=255)
    description      = models.TextField(blank=True, null=True)
    category         = models.CharField(max_length=50, choices=Category.choices, default=Category.TECHNICAL)
    probability      = models.SmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    impact           = models.SmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    score            = models.SmallIntegerField(editable=False)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.IDENTIFIED)
    response_type    = models.CharField(max_length=20, choices=ResponseType.choices, blank=True, null=True)
    owner            = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT,
        related_name="owned_risks", null=True, blank=True,
    )
    mitigation_plan  = models.TextField(blank=True, null=True)
    contingency_plan = models.TextField(blank=True, null=True)
    due_date         = models.DateField(null=True, blank=True)
    created_by       = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT,
        related_name="created_risks", db_column="created_by",
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        managed  = False
        db_table = "project_risks"
        ordering = ["-score", "title"]

    def save(self, *args, **kwargs):
        self.score = self.probability * self.impact
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (score={self.score})"
