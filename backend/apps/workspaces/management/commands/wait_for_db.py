import time

from django.core.management.base import BaseCommand
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Aguarda o banco de dados estar disponível (útil no Docker Compose)"

    def add_arguments(self, parser):
        parser.add_argument("--max-retries", type=int, default=30)
        parser.add_argument("--interval", type=float, default=2.0)

    def handle(self, *args, **options):
        self.stdout.write("Aguardando banco de dados...")
        max_retries = options["max_retries"]
        interval = options["interval"]

        for attempt in range(1, max_retries + 1):
            try:
                conn = connections["default"]
                conn.ensure_connection()
                self.stdout.write(self.style.SUCCESS("Banco de dados disponível."))
                return
            except OperationalError:
                self.stdout.write(f"  Tentativa {attempt}/{max_retries}...")
                time.sleep(interval)

        raise SystemExit(
            f"Banco de dados não disponível após {max_retries} tentativas."
        )
