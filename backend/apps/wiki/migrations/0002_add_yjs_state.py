# Generated manually on 2026-03-31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wiki', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='wikipage',
            name='yjs_state',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='wikipageversion',
            name='yjs_state',
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
