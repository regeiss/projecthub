import uuid

from django.db import models


class WikiSpace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="wiki_spaces"
    )
    # NULL = wiki global do workspace; preenchido = wiki do projeto
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="wiki_spaces",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=10, blank=True, null=True)
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_wiki_spaces",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "wiki_spaces"
        ordering = ["name"]

    def __str__(self):
        return self.name


class WikiPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        WikiSpace, on_delete=models.CASCADE, related_name="pages"
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    title = models.CharField(max_length=500)
    content = models.JSONField(null=True, blank=True)  # TipTap / Yjs state
    yjs_state = models.BinaryField(null=True, blank=True)
    emoji = models.CharField(max_length=10, blank=True, null=True)
    cover_url = models.TextField(blank=True, null=True)
    sort_order = models.FloatField(default=65535.0, db_column="position")
    is_locked = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    published_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    word_count = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="created_wiki_pages",
        db_column="created_by",
    )
    updated_by = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_wiki_pages",
        db_column="updated_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "wiki_pages"
        ordering = ["sort_order"]

    def __str__(self):
        return self.title


class WikiPageVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="versions")
    version_number = models.IntegerField()
    title = models.CharField(max_length=500)
    content = models.JSONField()
    yjs_state = models.BinaryField(null=True, blank=True)
    change_summary = models.CharField(max_length=500, blank=True, null=True)
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT, db_column="created_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "wiki_page_versions"
        ordering = ["-version_number"]

    def __str__(self):
        return f"{self.page.title} v{self.version_number}"


class WikiIssueLink(models.Model):
    class LinkType(models.TextChoices):
        SPEC = "spec", "Especificação"
        RUNBOOK = "runbook", "Runbook"
        POSTMORTEM = "postmortem", "Postmortem"
        DECISION = "decision", "Decisão"
        RELATED = "related", "Relacionado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="issue_links")
    issue = models.ForeignKey(
        "issues.Issue", on_delete=models.CASCADE, related_name="wiki_links"
    )
    link_type = models.CharField(
        max_length=20, choices=LinkType.choices, default=LinkType.RELATED
    )
    created_by = models.ForeignKey(
        "workspaces.WorkspaceMember", on_delete=models.PROTECT, db_column="created_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "wiki_issue_links"
        unique_together = [("page", "issue")]


class WikiPageComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(
        WikiPage, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        "workspaces.WorkspaceMember",
        on_delete=models.PROTECT,
        related_name="wiki_comments",
    )
    content = models.TextField()
    selection_text = models.TextField(blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "wiki_page_comments"
        ordering = ["created_at"]
