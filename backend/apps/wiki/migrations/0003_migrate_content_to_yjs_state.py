from django.db import migrations


def migrate_yjs_content(apps, schema_editor):
    WikiPage = apps.get_model("wiki", "WikiPage")
    for page in WikiPage.objects.all():
        if isinstance(page.content, dict) and "_yjs" in page.content:
            page.yjs_state = bytes.fromhex(page.content["_yjs"])
            page.content = {}
            page.save(update_fields=["content", "yjs_state"])


def reverse_migrate(apps, schema_editor):
    WikiPage = apps.get_model("wiki", "WikiPage")
    for page in WikiPage.objects.exclude(yjs_state=None):
        page.content = {"_yjs": bytes(page.yjs_state).hex()}
        page.yjs_state = None
        page.save(update_fields=["content", "yjs_state"])


class Migration(migrations.Migration):
    dependencies = [
        ("wiki", "0002_add_yjs_state"),
    ]

    operations = [
        migrations.RunPython(migrate_yjs_content, reverse_migrate),
    ]
