from django.contrib import admin

from .models import IssueState, Label, Project, ProjectMember


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "identifier", "status", "is_private", "created_at"]
    list_filter = ["status", "is_private"]
    search_fields = ["name", "identifier"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ["project", "member", "role"]
    list_filter = ["role"]


@admin.register(IssueState)
class IssueStateAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "category", "sequence", "is_default"]
    list_filter = ["category"]


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "color"]
