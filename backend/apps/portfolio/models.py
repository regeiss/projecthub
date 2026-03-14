import uuid
from decimal import Decimal

from django.db import models


class Portfolio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="portfolios"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="owned_portfolios",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "portfolios"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PortfolioProject(models.Model):
    class RagStatus(models.TextChoices):
        GREEN = "GREEN", "Verde"
        AMBER = "AMBER", "Amarelo"
        RED = "RED", "Vermelho"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, related_name="portfolio_projects"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="portfolio_entries"
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget_planned = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    budget_actual = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    rag_status = models.CharField(
        max_length=10, choices=RagStatus.choices, default=RagStatus.GREEN
    )
    rag_override = models.BooleanField(default=False)
    rag_note = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "portfolio_projects"
        unique_together = [("portfolio", "project")]
        ordering = ["project__name"]

    def __str__(self):
        return f"{self.portfolio} / {self.project}"


class PortfolioProjectDep(models.Model):
    """Dependência entre projetos dentro de um portfolio."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    predecessor = models.ForeignKey(
        PortfolioProject,
        on_delete=models.CASCADE,
        related_name="successor_deps",
    )
    successor = models.ForeignKey(
        PortfolioProject,
        on_delete=models.CASCADE,
        related_name="predecessor_deps",
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "portfolio_project_deps"

    def __str__(self):
        return f"{self.predecessor} → {self.successor}"


class PortfolioObjective(models.Model):
    """OKR / objetivo estratégico vinculado ao portfolio."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, related_name="objectives"
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    target_value = models.DecimalField(max_digits=10, decimal_places=2)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    unit = models.CharField(max_length=50, blank=True, null=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "portfolio_objectives"
        ordering = ["due_date", "title"]

    def __str__(self):
        return self.title

    @property
    def progress_pct(self):
        if not self.target_value:
            return 0
        return round(float(self.current_value / self.target_value * 100), 1)


class ObjectiveProject(models.Model):
    """Vínculo entre objetivo e projeto com peso de contribuição."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objective = models.ForeignKey(
        PortfolioObjective, on_delete=models.CASCADE, related_name="objective_projects"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="objective_links"
    )
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("1.0"))

    class Meta:
        managed = True
        db_table = "objective_projects"
        unique_together = [("objective", "project")]

    def __str__(self):
        return f"{self.objective} ← {self.project} (×{self.weight})"


class PortfolioCostEntry(models.Model):
    class Category(models.TextChoices):
        LABOR = "labor", "Mão de obra"
        INFRASTRUCTURE = "infrastructure", "Infraestrutura"
        LICENSES = "licenses", "Licenças"
        SERVICES = "services", "Serviços"
        OTHER = "other", "Outros"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio_project = models.ForeignKey(
        PortfolioProject, on_delete=models.CASCADE, related_name="cost_entries"
    )
    date = models.DateField(db_column="entry_date")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT, db_column="registered_by",
        null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "portfolio_cost_entries"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.portfolio_project} — {self.date} R${self.amount}"
