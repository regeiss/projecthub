from django.contrib import admin

from .models import Issue, IssueActivity, IssueComment, IssueRelation


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = [
        "sequence_id", "title", "project", "state", "priority",
        "type", "assignee", "created_at",
    ]
    list_filter = ["priority", "type", "state__category"]
    search_fields = ["title", "sequence_id"]
    readonly_fields = ["sequence_id", "created_at", "updated_at"]


@admin.register(IssueComment)
class IssueCommentAdmin(admin.ModelAdmin):
    list_display = ["issue", "author", "is_edited", "created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(IssueActivity)
class IssueActivityAdmin(admin.ModelAdmin):
    list_display = ["issue", "actor", "verb", "field", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(IssueRelation)
class IssueRelationAdmin(admin.ModelAdmin):
    list_display = ["issue", "relation_type", "related_issue", "lag_days"]
