from rest_framework import serializers

from apps.workspaces.serializers import WorkspaceMemberSerializer

from .models import WikiIssueLink, WikiPage, WikiPageComment, WikiPageVersion, WikiSpace


class WikiSpaceSerializer(serializers.ModelSerializer):
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)
    page_count = serializers.SerializerMethodField()

    class Meta:
        model = WikiSpace
        fields = [
            "id", "workspace", "project", "name", "description", "icon",
            "is_private", "created_by", "created_by_detail", "page_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_by", "created_at", "updated_at"]

    def get_page_count(self, obj):
        return obj.pages.filter(is_archived=False).count()


class WikiPageVersionSerializer(serializers.ModelSerializer):
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)

    class Meta:
        model = WikiPageVersion
        fields = [
            "id", "page", "version_number", "title", "content",
            "change_summary", "created_by", "created_by_detail", "created_at",
        ]
        read_only_fields = ["id", "page", "version_number", "created_by", "created_at"]


class WikiPageListSerializer(serializers.ModelSerializer):
    """Serializer leve para listagem (sem content)."""
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)
    updated_by_detail = WorkspaceMemberSerializer(source="updated_by", read_only=True)

    class Meta:
        model = WikiPage
        fields = [
            "id", "space", "parent", "title", "emoji", "cover_url",
            "sort_order", "is_locked", "is_archived", "is_published",
            "word_count", "created_by", "created_by_detail",
            "updated_by", "updated_by_detail", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "space", "created_by", "updated_by", "created_at", "updated_at"]


class WikiPageDetailSerializer(serializers.ModelSerializer):
    """Serializer completo incluindo content (JSON TipTap/Yjs)."""
    created_by_detail = WorkspaceMemberSerializer(source="created_by", read_only=True)
    updated_by_detail = WorkspaceMemberSerializer(source="updated_by", read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = WikiPage
        fields = [
            "id", "space", "parent", "title", "content", "emoji", "cover_url",
            "sort_order", "is_locked", "is_archived", "is_published",
            "published_token", "word_count",
            "created_by", "created_by_detail",
            "updated_by", "updated_by_detail",
            "children", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "space", "published_token", "created_by", "updated_by", "created_at", "updated_at",
        ]

    def get_children(self, obj):
        children = obj.children.filter(is_archived=False).order_by("sort_order")
        return WikiPageListSerializer(children, many=True).data


class WikiPageCommentSerializer(serializers.ModelSerializer):
    author_detail = WorkspaceMemberSerializer(source="author", read_only=True)

    class Meta:
        model = WikiPageComment
        fields = [
            "id", "page", "author", "author_detail", "content",
            "selection_text", "is_resolved", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "page", "author", "created_at", "updated_at"]


class WikiIssueLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = WikiIssueLink
        fields = ["id", "page", "issue", "link_type", "created_by", "created_at"]
        read_only_fields = ["id", "page", "created_by", "created_at"]
