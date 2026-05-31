from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("type", "recipient", "actor", "is_read", "created_at")
    list_filter = ("type", "is_read")
    search_fields = ("title", "recipient__name", "actor__name")
    raw_id_fields = ("recipient", "actor")
    readonly_fields = ("id", "created_at", "read_at")
