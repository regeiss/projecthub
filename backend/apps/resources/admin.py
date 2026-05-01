from django.contrib import admin
from .models import MemberCapacity, ResourceProfile, TimeEntry


@admin.register(ResourceProfile)
class ResourceProfileAdmin(admin.ModelAdmin):
    list_display = ['member', 'project', 'daily_rate_brl', 'created_at']
    list_filter = ['project']


@admin.register(MemberCapacity)
class MemberCapacityAdmin(admin.ModelAdmin):
    list_display = ['member', 'year', 'month', 'available_days']
    list_filter = ['year', 'month']


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['member', 'issue', 'date', 'hours', 'created_at']
    list_filter = ['date', 'member']
