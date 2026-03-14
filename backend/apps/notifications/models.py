import uuid

from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        ISSUE_ASSIGNED = "issue_assigned", "Issue atribuída"
        ISSUE_COMMENTED = "issue_commented", "Comentário em issue"
        ISSUE_STATE_CHANGED = "issue_state_changed", "Estado de issue alterado"
        CPM_CRITICAL_ALERT = "cpm_critical_alert", "Alerta CPM crítico"
        PORTFOLIO_RAG_CHANGED = "portfolio_rag_changed", "RAG do portfolio alterado"
        WIKI_MENTIONED = "wiki_mentioned", "Mencionado em wiki"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    type = models.CharField(max_length=50, choices=Type.choices)
    entity_type = models.CharField(max_length=50)   # "issue" | "wiki_page" | ...
    entity_id = models.UUIDField()
    title = models.CharField(max_length=500)
    message = models.TextField(blank=True, null=True)
    action_url = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} → {self.recipient}"
