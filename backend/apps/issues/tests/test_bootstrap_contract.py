from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[4]


class BootstrapContractTest(unittest.TestCase):
    def test_init_sql_does_not_create_application_tables(self) -> None:
        init_sql = (REPO_ROOT / "scripts" / "db" / "init.sql").read_text(
            encoding="utf-8"
        )

        self.assertNotRegex(
            init_sql,
            r"\bCREATE\s+TABLE\b",
            "init.sql should leave ORM-owned tables to Django migrations.",
        )

    def test_celery_services_wait_for_api_health(self) -> None:
        compose = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")

        worker_block = re.search(
            r"(?ms)^  celery_worker:\n(?P<body>.*?)(?=^  [a-z_]+:|\Z)", compose
        )
        beat_block = re.search(
            r"(?ms)^  celery_beat:\n(?P<body>.*?)(?=^  [a-z_]+:|\Z)", compose
        )

        self.assertIsNotNone(worker_block, "celery_worker service block not found")
        self.assertIsNotNone(beat_block, "celery_beat service block not found")
        self.assertRegex(
            worker_block.group("body"),
            r"(?ms)depends_on:\n(?:\s+.*\n)*\s+api:\n\s+condition:\s+service_healthy",
            "celery_worker should wait for the api service healthcheck.",
        )
        self.assertRegex(
            beat_block.group("body"),
            r"(?ms)depends_on:\n(?:\s+.*\n)*\s+api:\n\s+condition:\s+service_healthy",
            "celery_beat should wait for the api service healthcheck.",
        )


if __name__ == "__main__":
    unittest.main()
