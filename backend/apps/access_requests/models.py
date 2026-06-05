import uuid
from django.db import models


class AccessRequest(models.Model):
  class Status(models.TextChoices):
    PENDING  = "pending",  "Pendente"
    APPROVED = "approved", "Aprovado"
    DENIED   = "denied",   "Negado"

  id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  keycloak_sub     = models.CharField(max_length=255, db_index=True)
  email            = models.EmailField(max_length=255)
  name             = models.CharField(max_length=255)
  workspace        = models.ForeignKey(
    "workspaces.Workspace", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="access_requests",
  )
  workspace_name   = models.CharField(max_length=255)
  secretaria       = models.CharField(max_length=120)
  reason           = models.TextField(blank=True)
  status           = models.CharField(
    max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
  )
  denial_reason    = models.TextField(blank=True)
  requested_at     = models.DateTimeField(auto_now_add=True)
  resolved_at      = models.DateTimeField(null=True, blank=True)
  resolved_by      = models.ForeignKey(
    "workspaces.WorkspaceMember", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="resolved_access_requests",
  )
  previous_request = models.ForeignKey(
    "self", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="re_requests",
  )

  class Meta:
    db_table = "access_requests"
    ordering = ["-requested_at"]

  def __str__(self):
    return f"{self.name} ({self.email}) → {self.workspace_name}"
