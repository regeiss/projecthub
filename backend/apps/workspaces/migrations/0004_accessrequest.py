import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0003_personaltask"),
    ]

    operations = [
        migrations.CreateModel(
            name="AccessRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("workspace_name", models.CharField(max_length=255)),
                ("keycloak_sub", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=255)),
                ("name", models.CharField(max_length=255)),
                ("secretaria", models.CharField(max_length=255)),
                ("reason", models.TextField(blank=True, default="")),
                ("status", models.CharField(
                    choices=[("pending", "Pendente"), ("approved", "Aprovado"), ("denied", "Negado")],
                    default="pending",
                    max_length=20,
                )),
                ("denial_reason", models.TextField(blank=True, null=True)),
                ("previous_denial_count", models.PositiveIntegerField(default=0)),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("resolved_by", models.CharField(blank=True, max_length=255, null=True)),
                ("workspace", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="access_requests",
                    to="workspaces.workspace",
                )),
            ],
            options={
                "db_table": "access_requests",
                "ordering": ["-requested_at"],
                "managed": True,
            },
        ),
    ]
