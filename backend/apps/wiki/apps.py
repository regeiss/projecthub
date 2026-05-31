from django.apps import AppConfig


class WikiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.wiki"

    def ready(self):
        from django.db.models.signals import post_save
        from django.apps import apps

        from apps.wiki.signals import create_wiki_activity

        WikiPage = apps.get_model("wiki", "WikiPage")
        post_save.connect(
            create_wiki_activity,
            sender=WikiPage,
            dispatch_uid="wiki.create_wiki_activity",
        )
