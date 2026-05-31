from django.db import migrations, models


def backfill_content_text(apps, schema_editor):
    from apps.wiki.utils import extract_text_from_tiptap

    WikiPage = apps.get_model("wiki", "WikiPage")
    to_update = []
    for page in WikiPage.objects.exclude(content=None).iterator(chunk_size=200):
        page.content_text = extract_text_from_tiptap(page.content)
        to_update.append(page)
    if to_update:
        WikiPage.objects.bulk_update(to_update, ["content_text"], batch_size=200)


class Migration(migrations.Migration):

    dependencies = [
        ("wiki", "0003_migrate_content_to_yjs_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="wikipage",
            name="content_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(backfill_content_text, migrations.RunPython.noop),
    ]
