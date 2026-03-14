from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"

    def ready(self):
        from django.db.models.signals import post_save

        from apps.notifications.signals import (
            notify_issue_assigned_on_create,
            notify_issue_commented,
            notify_issue_state_changed,
            notify_wiki_mentioned,
        )

        # Importa modelos via apps registry para evitar circular imports
        from django.apps import apps

        Issue = apps.get_model("issues", "Issue")
        IssueComment = apps.get_model("issues", "IssueComment")
        WikiPageComment = apps.get_model("wiki", "WikiPageComment")

        post_save.connect(
            notify_issue_assigned_on_create,
            sender=Issue,
            dispatch_uid="notifications.issue_assigned_on_create",
        )
        post_save.connect(
            notify_issue_commented,
            sender=IssueComment,
            dispatch_uid="notifications.issue_commented",
        )
        post_save.connect(
            notify_issue_state_changed,
            sender=Issue,
            dispatch_uid="notifications.issue_state_changed",
        )
        post_save.connect(
            notify_wiki_mentioned,
            sender=WikiPageComment,
            dispatch_uid="notifications.wiki_mentioned",
        )
