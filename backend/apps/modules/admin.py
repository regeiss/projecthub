from django.contrib import admin

from .models import Module, ModuleIssue


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "status", "lead", "start_date", "target_date"]
    list_filter = ["status"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ModuleIssue)
class ModuleIssueAdmin(admin.ModelAdmin):
    list_display = ["module", "issue", "added_at"]
    readonly_fields = ["added_at"]
