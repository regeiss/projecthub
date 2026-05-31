from django.contrib import admin

from .models import (
    ObjectiveProject,
    Portfolio,
    PortfolioCostEntry,
    PortfolioObjective,
    PortfolioProject,
    PortfolioProjectDep,
)


class PortfolioProjectInline(admin.TabularInline):
    model = PortfolioProject
    extra = 0
    fields = ("project", "start_date", "end_date", "rag_status", "rag_override", "budget_planned", "budget_actual")
    raw_id_fields = ("project",)


class PortfolioObjectiveInline(admin.TabularInline):
    model = PortfolioObjective
    extra = 0
    fields = ("title", "target_value", "current_value", "unit", "due_date")


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "owner", "created_at")
    raw_id_fields = ("workspace", "owner")
    inlines = [PortfolioProjectInline, PortfolioObjectiveInline]


@admin.register(PortfolioProject)
class PortfolioProjectAdmin(admin.ModelAdmin):
    list_display = ("project", "portfolio", "rag_status", "rag_override", "budget_planned", "budget_actual", "start_date", "end_date")
    list_filter = ("rag_status", "rag_override")
    raw_id_fields = ("portfolio", "project")


@admin.register(PortfolioObjective)
class PortfolioObjectiveAdmin(admin.ModelAdmin):
    list_display = ("title", "portfolio", "target_value", "current_value", "unit", "due_date")
    raw_id_fields = ("portfolio",)


@admin.register(PortfolioCostEntry)
class PortfolioCostEntryAdmin(admin.ModelAdmin):
    list_display = ("portfolio_project", "date", "amount", "category", "created_by")
    list_filter = ("category",)
    raw_id_fields = ("portfolio_project", "created_by")
