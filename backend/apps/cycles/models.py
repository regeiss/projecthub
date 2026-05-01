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


class SprintPlan(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPLIED = "applied", "Applied"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.OneToOneField(
        Cycle, on_delete=models.CASCADE, related_name="sprint_plan"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_sprint_plans",
        db_column="created_by",
    )
    applied_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="applied_sprint_plans",
        db_column="applied_by",
    )
    applied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plans"


class SprintPlanMemberCapacity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        SprintPlan, on_delete=models.CASCADE, related_name="member_capacities"
    )
    member = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.CASCADE,
        related_name="sprint_plan_capacities",
    )
    default_days = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    override_days = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plan_member_capacities"
        unique_together = [("plan", "member")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(default_days__gte=0),
                name="sprint_plan_member_capacity_default_days_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(override_days__isnull=True)
                | models.Q(override_days__gte=0),
                name="sprint_plan_member_capacity_override_days_non_negative",
            ),
        ]


class SprintPlanAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        SprintPlan, on_delete=models.CASCADE, related_name="allocations"
    )
    issue = models.ForeignKey(
        "issues.Issue", on_delete=models.CASCADE, related_name="sprint_plan_allocations"
    )
    planned_member = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sprint_plan_allocations",
    )
    rank = models.PositiveIntegerField(default=1)
    planned_days = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    planned_story_points = models.IntegerField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "sprint_plan_allocations"
        unique_together = [("plan", "issue")]
        ordering = ["rank", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(planned_days__isnull=True)
                | models.Q(planned_days__gte=0),
                name="sprint_plan_allocation_planned_days_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(planned_story_points__isnull=True)
                | models.Q(planned_story_points__gte=0),
                name="sprint_plan_allocation_story_points_non_negative",
            ),
        ]
