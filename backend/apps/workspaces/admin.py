from django.contrib import admin

from .models import Workspace, WorkspaceMember


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "created_at"]
    search_fields = ["name", "slug"]


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "role", "is_active", "last_login_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["name", "email", "keycloak_sub"]
    readonly_fields = ["keycloak_sub", "last_login_at", "created_at", "updated_at"]
