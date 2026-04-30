from django.core.management.base import BaseCommand
from apps.workspaces.models import Workspace


class Command(BaseCommand):
    help = "Cria workspace padrão se não existir nenhum"

    def handle(self, *args, **kwargs):
        if not Workspace.objects.exists():
            import os
            name = os.environ.get("DEFAULT_WORKSPACE_NAME", "Default")
            slug = os.environ.get("DEFAULT_WORKSPACE_SLUG", "default")
            ws = Workspace.objects.create(name=name, slug=slug)
            self.stdout.write(f"Workspace criado: {ws.name} ({ws.slug})")
        else:
            self.stdout.write("Workspace já existe, nada a fazer.")