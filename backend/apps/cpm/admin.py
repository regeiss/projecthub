from django.contrib import admin

from .models import CpmBaseline, CpmIssueData


@admin.register(CpmIssueData)
class CpmIssueDataAdmin(admin.ModelAdmin):
    list_display = ("issue", "duration_days", "es", "ef", "ls", "lf", "slack", "is_critical", "calculated_at")
    list_filter = ("is_critical",)
    raw_id_fields = ("issue",)
    readonly_fields = ("issue", "calculated_at")


@admin.register(CpmBaseline)
class CpmBaselineAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "created_by", "created_at")
    raw_id_fields = ("project", "created_by")
    readonly_fields = ("id", "created_at")
