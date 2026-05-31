import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0002_alter_workspacemember_keycloak_sub_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="PersonalTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("member", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="personal_tasks",
                    to="workspaces.workspacemember",
                )),
                ("title", models.TextField()),
                ("done", models.BooleanField(default=False)),
                ("sort_order", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "personal_tasks",
                "ordering": ["sort_order", "created_at"],
                "managed": True,
            },
        ),
    ]
