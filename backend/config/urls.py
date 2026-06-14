# =============================================================================
# ProjectHub - config/urls.py
# =============================================================================

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.workspaces.views import GlobalSearchView

urlpatterns = [
    # Admin Django (uso interno)
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/workspaces/", include("apps.workspaces.urls")),
    path("api/v1/projects/", include("apps.projects.urls")),
    path("api/v1/issues/", include("apps.issues.urls")),
    path("api/v1/issue-templates/", include("apps.issues.template_urls")),
    path("api/v1/cycles/", include(("apps.cycles.urls", "cycles"))),
    path("api/v1/modules/", include(("apps.modules.urls", "modules"))),
    path("api/v1/wiki/", include("apps.wiki.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/cpm/", include("apps.cpm.urls")),
    path("api/v1/portfolio/", include("apps.portfolio.urls")),
    path("api/v1/resources/", include(("apps.resources.urls", "resources"))),
    path("api/v1/discovery/", include(("apps.discovery.urls", "discovery"))),
    path("api/v1/tasks/",     include("apps.workspaces.task_urls")),
    path("api/v1/search/", GlobalSearchView.as_view(), name="global-search"),

    # Health check
    path("api/health/", include("health_check.urls")),

    # OpenAPI Docs (desabilitar em produção se necessário)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
