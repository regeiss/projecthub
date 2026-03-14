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
        managed = True
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
    keycloak_sub = models.CharField(max_length=255, unique=True)
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
        managed = True
        db_table = "workspace_members"

    def __str__(self):
        return f"{self.name} ({self.email})"
