from django.contrib import admin

from .models import WikiIssueLink, WikiPage, WikiPageComment, WikiPageVersion, WikiSpace


@admin.register(WikiSpace)
class WikiSpaceAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "project", "is_private", "created_at")
    list_filter = ("is_private", "workspace")
    search_fields = ("name",)
    raw_id_fields = ("workspace", "project", "created_by")


class WikiPageVersionInline(admin.TabularInline):
    model = WikiPageVersion
    extra = 0
    fields = ("version_number", "title", "change_summary", "created_by", "created_at")
    readonly_fields = ("created_at",)


@admin.register(WikiPage)
class WikiPageAdmin(admin.ModelAdmin):
    list_display = ("title", "space", "parent", "is_locked", "is_archived", "is_published", "updated_at")
    list_filter = ("is_locked", "is_archived", "is_published", "space")
    search_fields = ("title",)
    raw_id_fields = ("space", "parent", "created_by", "updated_by")
    inlines = [WikiPageVersionInline]


@admin.register(WikiPageComment)
class WikiPageCommentAdmin(admin.ModelAdmin):
    list_display = ("page", "author", "is_resolved", "created_at")
    list_filter = ("is_resolved",)
    raw_id_fields = ("page", "author")


@admin.register(WikiIssueLink)
class WikiIssueLinkAdmin(admin.ModelAdmin):
    list_display = ("page", "issue", "link_type", "created_at")
    list_filter = ("link_type",)
    raw_id_fields = ("page", "issue", "created_by")
