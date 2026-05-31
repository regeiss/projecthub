from django.contrib import admin

from .models import Cycle, CycleIssue


@admin.register(Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "status", "start_date", "end_date"]
    list_filter = ["status"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(CycleIssue)
class CycleIssueAdmin(admin.ModelAdmin):
    list_display = ["cycle", "issue", "added_at"]
    readonly_fields = ["added_at"]
