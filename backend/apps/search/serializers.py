from rest_framework import serializers


class ProjectBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    identifier = serializers.CharField()


class StateBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    color = serializers.CharField()


class MemberBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        return getattr(obj, "avatar_url", None)


class SpaceBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class IdeaSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    headline = serializers.SerializerMethodField()

    def get_headline(self, obj):
        return getattr(obj, "headline", "") or ""


class IssueSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    sequence_id = serializers.IntegerField(allow_null=True)
    title = serializers.CharField()
    project = ProjectBriefSerializer()
    state = StateBriefSerializer(allow_null=True)
    created_by = MemberBriefSerializer(allow_null=True)  # defensive: queryset may omit created_by in edge cases
    created_at = serializers.DateTimeField()
    headline = serializers.SerializerMethodField()

    def get_headline(self, obj):
        return getattr(obj, "headline", "") or ""


class WikiPageSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    space = SpaceBriefSerializer()
    project = serializers.SerializerMethodField()
    created_by = MemberBriefSerializer(allow_null=True)  # defensive: queryset may omit created_by in edge cases
    updated_at = serializers.DateTimeField()
    headline = serializers.SerializerMethodField()

    def get_project(self, obj):
        project = getattr(obj.space, "project", None)
        if project is None:
            return None
        return {"id": str(project.id), "name": project.name, "identifier": project.identifier}

    def get_headline(self, obj):
        return getattr(obj, "headline", "") or ""
