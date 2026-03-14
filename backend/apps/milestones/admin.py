from django.contrib import admin

from .models import Milestone


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display  = ('name', 'project', 'due_date', 'status', 'created_at')
    list_filter   = ('status',)
    raw_id_fields = ('project', 'created_by')
