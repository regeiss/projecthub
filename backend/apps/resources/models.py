import uuid
from django.db import models


class ResourceProfile(models.Model):
    """Daily rate for a workspace member on a specific project."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='resource_profiles'
    )
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.CASCADE, related_name='resource_profiles'
    )
    daily_rate_brl = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = 'resource_profiles'
        unique_together = [('project', 'member')]

    def __str__(self):
        return f'{self.member} @ {self.project} — R${self.daily_rate_brl}/dia'


class MemberCapacity(models.Model):
    """Available working days for a member in a calendar month."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.CASCADE, related_name='capacities'
    )
    year = models.IntegerField()
    month = models.IntegerField()  # 1–12
    available_days = models.DecimalField(max_digits=5, decimal_places=1)
    note = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'member_capacities'
        unique_together = [('member', 'year', 'month')]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(month__gte=1, month__lte=12),
                name='member_capacity_month_1_12',
            ),
            models.CheckConstraint(
                condition=models.Q(available_days__gte=0),
                name='member_capacity_available_days_non_negative',
            ),
        ]

    def __str__(self):
        return f'{self.member} — {self.year}/{self.month:02d}: {self.available_days}d'


class TimeEntry(models.Model):
    """
    Actual hours logged by a member against an issue.
    Immutable: corrections are new entries with negative hours.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        'issues.Issue', on_delete=models.CASCADE, related_name='time_entries'
    )
    member = models.ForeignKey(
        'workspaces.WorkspaceMember', on_delete=models.PROTECT, related_name='time_entries'
    )
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)  # may be negative
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("TimeEntry é imutável. Crie um novo lançamento de correção.")
        super().save(*args, **kwargs)

    class Meta:
        managed = True
        db_table = 'time_entries'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.member} on {self.issue_id}: {self.hours}h @ {self.date}'
