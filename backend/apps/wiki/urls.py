from django.urls import path

from .views import (
    WikiIssueLinkDestroyView,
    WikiIssueLinkListCreateView,
    WikiPageCommentDetailView,
    WikiPageCommentListCreateView,
    WikiPageCommentResolveView,
    WikiPageDetailView,
    WikiPageListCreateView,
    WikiPageMoveView,
    WikiPagePublicView,
    WikiPagePublishView,
    WikiPageVersionListView,
    WikiPageVersionRestoreView,
    WikiSpaceDetailView,
    WikiSpaceListCreateView,
)

urlpatterns = [
    # Spaces
    path("spaces/", WikiSpaceListCreateView.as_view(), name="wiki-space-list"),
    path("spaces/<uuid:pk>/", WikiSpaceDetailView.as_view(), name="wiki-space-detail"),

    # Pages dentro de um space
    path("spaces/<uuid:space_pk>/pages/", WikiPageListCreateView.as_view(), name="wiki-page-list"),

    # Operações em páginas individuais
    path("pages/<uuid:pk>/", WikiPageDetailView.as_view(), name="wiki-page-detail"),
    path("pages/<uuid:pk>/move/", WikiPageMoveView.as_view(), name="wiki-page-move"),
    path("pages/<uuid:pk>/publish/", WikiPagePublishView.as_view(), name="wiki-page-publish"),

    # Versões
    path("pages/<uuid:page_pk>/versions/", WikiPageVersionListView.as_view(), name="wiki-page-versions"),
    path(
        "pages/<uuid:page_pk>/versions/<uuid:pk>/restore/",
        WikiPageVersionRestoreView.as_view(),
        name="wiki-page-version-restore",
    ),

    # Comentários
    path("pages/<uuid:page_pk>/comments/", WikiPageCommentListCreateView.as_view(), name="wiki-comment-list"),
    path("comments/<uuid:pk>/", WikiPageCommentDetailView.as_view(), name="wiki-comment-detail"),
    path("comments/<uuid:pk>/resolve/", WikiPageCommentResolveView.as_view(), name="wiki-comment-resolve"),

    # Links issue ↔ página
    path("pages/<uuid:page_pk>/issue-links/", WikiIssueLinkListCreateView.as_view(), name="wiki-issue-link-list"),
    path("issue-links/<uuid:pk>/", WikiIssueLinkDestroyView.as_view(), name="wiki-issue-link-detail"),

    # Página pública (sem auth)
    path("public/<str:token>/", WikiPagePublicView.as_view(), name="wiki-page-public"),
]
