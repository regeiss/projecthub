from decimal import Decimal

from rest_framework import serializers

_ACTIVE_RISK_STATUSES = ["identified", "analyzing", "mitigating", "monitoring"]

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import (
    ObjectiveProject,
    Portfolio,
    PortfolioCostEntry,
    PortfolioObjective,
    PortfolioProject,
    PortfolioProjectDep,
)


class PortfolioSerializer(serializers.ModelSerializer):
    owner_detail = WorkspaceMemberSerializer(source="owner", read_only=True)
    project_count = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            "id", "workspace", "name", "description",
            "owner", "owner_detail", "project_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "workspace", "owner", "created_at", "updated_at"]

    def get_project_count(self, obj):
        return obj.portfolio_projects.count()


class PortfolioProjectSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)
    rag_label = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioProject
        fields = [
            "id", "portfolio", "project",
            "project_name", "project_identifier",
            "start_date", "end_date",
            "budget_planned", "budget_actual",
            "rag_status", "rag_label", "rag_override", "rag_note",
            "updated_at",
        ]
        read_only_fields = ["id", "portfolio", "updated_at"]

    def get_rag_label(self, obj):
        return obj.get_rag_status_display()


class PortfolioProjectDepSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioProjectDep
        fields = ["id", "predecessor", "successor", "created_at"]
        read_only_fields = ["id", "created_at"]


class ObjectiveProjectSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ObjectiveProject
        fields = ["objective", "project", "project_name", "weight"]
        read_only_fields = ["objective"]


class PortfolioObjectiveSerializer(serializers.ModelSerializer):
    progress_pct = serializers.FloatField(read_only=True)
    linked_projects = ObjectiveProjectSerializer(
        source="objective_projects", many=True, read_only=True
    )

    class Meta:
        model = PortfolioObjective
        fields = [
            "id", "portfolio", "title", "description",
            "target_value", "current_value", "unit",
            "due_date", "progress_pct", "linked_projects",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "portfolio", "created_at", "updated_at"]

    def to_internal_value(self, data):
        # Accept camelCase from frontend as well as snake_case
        camel_map = {
            "targetValue":  "target_value",
            "currentValue": "current_value",
            "dueDate":      "due_date",
        }
        data = {camel_map.get(k, k): v for k, v in data.items()}
        return super().to_internal_value(data)


class PortfolioCostEntrySerializer(serializers.ModelSerializer):
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)

    class Meta:
        model = PortfolioCostEntry
        fields = [
            "id", "portfolio_project", "date", "amount",
            "category", "description",
            "created_by", "created_by_detail", "created_at",
        ]
        read_only_fields = ["id", "portfolio_project", "created_by", "created_at"]


class PortfolioDashboardProjectSerializer(serializers.ModelSerializer):
    """Serializer enriquecido para o dashboard — inclui EVM calculado."""
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)
    evm                 = serializers.SerializerMethodField()
    risk_count          = serializers.SerializerMethodField()
    critical_risk_count = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioProject
        fields = [
            "id", "project", "project_name", "project_identifier",
            "start_date", "end_date",
            "budget_planned", "budget_actual",
            "rag_status", "rag_override", "rag_note",
            "evm",
            "risk_count", "critical_risk_count",
        ]

    def get_evm(self, obj):
        from .rag import calcular_evm
        try:
            data = calcular_evm(obj)
            # Converte Decimal para float para serialização JSON
            return {k: float(v) if isinstance(v, Decimal) else v for k, v in data.items()}
        except Exception:
            return {}

    def get_risk_count(self, obj) -> int:
        return obj.project.risks.filter(status__in=_ACTIVE_RISK_STATUSES).count()

    def get_critical_risk_count(self, obj) -> int:
        return obj.project.risks.filter(status__in=_ACTIVE_RISK_STATUSES, score__gte=15).count()


class RoadmapProjectSerializer(serializers.ModelSerializer):
    """Serializer para o roadmap — foco nas datas e RAG."""
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)
    predecessors = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioProject
        fields = [
            "id", "project", "project_name", "project_identifier", "project_color",
            "start_date", "end_date", "rag_status", "predecessors",
        ]

    def get_predecessors(self, obj):
        return list(
            obj.predecessor_deps.values_list("predecessor_id", flat=True).distinct()
        )
