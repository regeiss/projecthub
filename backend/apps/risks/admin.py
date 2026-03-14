from django.contrib import admin
from .models import Risk


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display  = ("title", "project", "category", "probability", "impact", "score", "status")
    list_filter   = ("status", "category")
    search_fields = ("title",)
    ordering      = ("-score",)
