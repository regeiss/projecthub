import uuid

from django.db import models


class Milestone(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendente'
        REACHED = 'reached', 'Atingido'
        MISSED  = 'missed',  'Perdido'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project     = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='milestones',
    )
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date    = models.DateField(null=True, blank=True)
    status      = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_by  = models.ForeignKey(
        'workspaces.WorkspaceMember',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = 'milestones'
        ordering = ['due_date', 'name']

    def __str__(self) -> str:
        return f"{self.project} — {self.name}"
