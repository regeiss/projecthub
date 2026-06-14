import uuid as _uuid

from django.db.models import Q
from django.contrib.postgres.search import (
    SearchHeadline,
    SearchQuery,
    SearchRank,
    SearchVector,
)
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsWorkspaceMember

from apps.discovery.models import Idea
from apps.issues.models import Issue
from apps.wiki.models import WikiPage

from .serializers import IdeaSearchResultSerializer, IssueSearchResultSerializer, WikiPageSearchResultSerializer


class GlobalSearchView(APIView):
    permission_classes = [IsWorkspaceMember]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response(
                {"detail": "O parâmetro 'q' deve ter pelo menos 2 caracteres."},
                status=400,
            )

        project_id = request.query_params.get("project_id")
        author_id = request.query_params.get("author_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        parsed_date_from = None
        parsed_date_to = None
        if date_from:
            parsed_date_from = parse_date(date_from)
            if parsed_date_from is None:
                return Response({"detail": "Parâmetro date_from inválido."}, status=400)
        if date_to:
            parsed_date_to = parse_date(date_to)
            if parsed_date_to is None:
                return Response({"detail": "Parâmetro date_to inválido."}, status=400)

        if project_id:
            try:
                _uuid.UUID(project_id)
            except ValueError:
                return Response({"detail": "project_id inválido."}, status=400)

        if author_id:
            try:
                _uuid.UUID(author_id)
            except ValueError:
                return Response({"detail": "author_id inválido."}, status=400)

        issues = self._search_issues(
            request.user, q, project_id, author_id, parsed_date_from, parsed_date_to
        )
        wiki_pages = self._search_wiki(
            request.user, q, project_id, author_id, parsed_date_from, parsed_date_to
        )
        ideas = self._search_ideas(request.user, q, parsed_date_from, parsed_date_to)

        return Response(
            {
                "issues": IssueSearchResultSerializer(issues, many=True).data,
                "wiki_pages": WikiPageSearchResultSerializer(wiki_pages, many=True).data,
                "ideas": IdeaSearchResultSerializer(ideas, many=True).data,
                "total": len(issues) + len(wiki_pages) + len(ideas),
            }
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _search_issues(self, user, q, project_id, author_id, date_from, date_to):
        query = SearchQuery(q, config="portuguese")
        vector = SearchVector(
            "title", weight="A", config="portuguese"
        ) + SearchVector("description_text", weight="B", config="portuguese")

        qs = Issue.objects.filter(project__workspace=user.workspace)
        if user.role != "admin":
            qs = qs.filter(
                Q(project__is_private=False)
                | Q(project__members__member=user)
            )
        qs = (
            qs.distinct()
            .annotate(rank=SearchRank(vector, query))
            .filter(rank__gt=0.01)
            .annotate(
                headline=SearchHeadline(
                    "description_text",
                    query,
                    config="portuguese",
                    start_sel="<mark>",
                    stop_sel="</mark>",
                    max_words=20,
                    min_words=10,
                    highlight_all=False,
                )
            )
            .select_related("project", "state", "created_by")
            .order_by("-rank")
        )

        if project_id:
            qs = qs.filter(project_id=project_id)
        if author_id:
            qs = qs.filter(created_by_id=author_id)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return list(qs[:8])

    def _search_wiki(self, user, q, project_id, author_id, date_from, date_to):
        query = SearchQuery(q, config="portuguese")
        vector = SearchVector(
            "title", weight="A", config="portuguese"
        ) + SearchVector("content_text", weight="B", config="portuguese")

        qs = WikiPage.objects.filter(
            space__workspace=user.workspace,
            is_archived=False,
        )
        if user.role != "admin":
            qs = qs.filter(
                Q(space__is_private=False)
                | Q(space__project__members__member=user)
            )
        qs = (
            qs.distinct()
            .annotate(rank=SearchRank(vector, query))
            .filter(rank__gt=0.01)
            .annotate(
                headline=SearchHeadline(
                    "content_text",
                    query,
                    config="portuguese",
                    start_sel="<mark>",
                    stop_sel="</mark>",
                    max_words=20,
                    min_words=10,
                    highlight_all=False,
                )
            )
            .select_related("space", "space__project", "created_by")
            .order_by("-rank")
        )

        if project_id:
            qs = qs.filter(space__project_id=project_id)
        if author_id:
            qs = qs.filter(created_by__isnull=False, created_by_id=author_id)
        if date_from:
            qs = qs.filter(updated_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(updated_at__date__lte=date_to)

        return list(qs[:8])

    def _search_ideas(self, user, q, date_from, date_to):
        query = SearchQuery(q, config="portuguese")
        vector = SearchVector("title", weight="A", config="portuguese") + SearchVector(
            "summary", weight="B", config="portuguese"
        )

        qs = (
            Idea.objects.filter(workspace=user.workspace)
            .distinct()
            .annotate(rank=SearchRank(vector, query))
            .filter(rank__gt=0.01)
            .annotate(
                headline=SearchHeadline(
                    "summary",
                    query,
                    config="portuguese",
                    start_sel="<mark>",
                    stop_sel="</mark>",
                    max_words=20,
                    min_words=10,
                    highlight_all=False,
                )
            )
            .order_by("-rank")
        )

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return list(qs[:8])
