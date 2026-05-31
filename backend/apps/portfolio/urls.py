from django.urls import path

from .views import (
    ObjectiveProjectLinkView,
    PortfolioCostEntryDestroyView,
    PortfolioCostEntryListCreateView,
    PortfolioDashboardView,
    PortfolioDepDestroyView,
    PortfolioDepListCreateView,
    PortfolioDetailView,
    PortfolioListCreateView,
    PortfolioObjectiveDetailView,
    PortfolioObjectiveListCreateView,
    PortfolioProjectDetailView,
    PortfolioProjectListCreateView,
    PortfolioRecalculateRagView,
    PortfolioRoadmapView,
)

urlpatterns = [
    # Portfolio
    path("", PortfolioListCreateView.as_view(), name="portfolio-list"),
    path("<uuid:pk>/", PortfolioDetailView.as_view(), name="portfolio-detail"),

    # Dashboard e Roadmap
    path("<uuid:portfolio_pk>/dashboard/", PortfolioDashboardView.as_view(), name="portfolio-dashboard"),
    path("<uuid:portfolio_pk>/roadmap/", PortfolioRoadmapView.as_view(), name="portfolio-roadmap"),
    path("<uuid:portfolio_pk>/recalculate-rag/", PortfolioRecalculateRagView.as_view(), name="portfolio-recalculate-rag"),

    # Projetos no portfolio
    path("<uuid:portfolio_pk>/projects/", PortfolioProjectListCreateView.as_view(), name="portfolio-project-list"),
    path("<uuid:portfolio_pk>/projects/<uuid:pk>/", PortfolioProjectDetailView.as_view(), name="portfolio-project-detail"),

    # Custos por projeto
    path(
        "<uuid:portfolio_pk>/projects/<uuid:pp_pk>/costs/",
        PortfolioCostEntryListCreateView.as_view(),
        name="portfolio-cost-list",
    ),
    path(
        "<uuid:portfolio_pk>/projects/<uuid:pp_pk>/costs/<uuid:pk>/",
        PortfolioCostEntryDestroyView.as_view(),
        name="portfolio-cost-delete",
    ),

    # Objetivos (OKRs)
    path("<uuid:portfolio_pk>/objectives/", PortfolioObjectiveListCreateView.as_view(), name="portfolio-objective-list"),
    path("<uuid:portfolio_pk>/objectives/<uuid:pk>/", PortfolioObjectiveDetailView.as_view(), name="portfolio-objective-detail"),

    # Vínculos objetivo ↔ projeto
    path(
        "<uuid:portfolio_pk>/objectives/<uuid:objective_pk>/projects/",
        ObjectiveProjectLinkView.as_view(),
        name="portfolio-objective-project-link",
    ),
    path(
        "<uuid:portfolio_pk>/objectives/<uuid:objective_pk>/projects/<uuid:project_pk>/",
        ObjectiveProjectLinkView.as_view(),
        name="portfolio-objective-project-unlink",
    ),

    # Dependências entre projetos
    path("<uuid:portfolio_pk>/deps/", PortfolioDepListCreateView.as_view(), name="portfolio-dep-list"),
    path("<uuid:portfolio_pk>/deps/<uuid:pk>/", PortfolioDepDestroyView.as_view(), name="portfolio-dep-delete"),
]
