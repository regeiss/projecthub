import uuid

from django.db import models


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    logo_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "workspaces"

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrador"
        MEMBER = "member", "Membro"
        GUEST = "guest", "Convidado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    keycloak_sub = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    name = models.CharField(max_length=255)
    avatar_url = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="joined_at")
    updated_at = models.DateTimeField(auto_now=True)

    # Necessário para o sistema de auth do Django / DRF
    is_authenticated = True
    is_anonymous = False

    class Meta:
        managed = False
        db_table = "workspace_members"
        unique_together = [("workspace", "keycloak_sub")]

    def __str__(self):
        return f"{self.name} ({self.email})"


class PersonalTask(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member     = models.ForeignKey(WorkspaceMember, on_delete=models.CASCADE, related_name="personal_tasks")
    title      = models.TextField()
    done       = models.BooleanField(default=False)
    sort_order = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "personal_tasks"
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return self.title


class AccessRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        APPROVED = "approved", "Aprovado"
        DENIED = "denied", "Negado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.SET_NULL,
        related_name="access_requests",
        null=True,
        blank=True,
    )
    workspace_name = models.CharField(max_length=255)
    keycloak_sub = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    name = models.CharField(max_length=255)
    secretaria = models.CharField(max_length=255)
    reason = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    denial_reason = models.TextField(blank=True, null=True)
    previous_denial_count = models.PositiveIntegerField(default=0)
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = True
        db_table = "access_requests"
        ordering = ["-requested_at"]

    def __str__(self):
        return f"{self.name} -> {self.workspace_name} ({self.status})"
