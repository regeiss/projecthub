"""
Custom health checks for ProjectHub.
"""

from django.core.management.sql import emit_post_migrate_signal
from django.db import connections, DEFAULT_DB_ALIAS
from django.db.migrations.executor import MigrationExecutor
from health_check.backends import BaseHealthCheckBackend


class MigrationHealthCheck(BaseHealthCheckBackend):
    """
    Health check that verifies all migrations have been applied.
    
    This ensures that containers only mark the API as healthy after
    migrations complete, preventing worker startup race conditions.
    """
    
    verbose_name = "Database Migrations"
    
    def check_status(self):
        """Check if all pending migrations have been applied."""
        try:
            # Get the default database connection
            db = connections[DEFAULT_DB_ALIAS]
            
            # Ensure the connection is valid
            try:
                db.ensure_connection()
            except Exception as e:
                self.add_error(f"Database connection failed: {str(e)}")
                return
            
            # Create executor and check for pending migrations
            try:
                executor = MigrationExecutor(db)
                targets = executor.loader.graph.leaf_nodes()
                plan = executor.migration_plan(targets)
                
                if plan:
                    # There are pending migrations
                    migration_names = [f"{m[0]}.{m[1]}" for m in plan]
                    self.add_error(
                        f"Found {len(plan)} pending migration(s): {', '.join(migration_names)}",
                        "Run 'python manage.py migrate' to apply migrations"
                    )
                else:
                    # All migrations are applied
                    self.add_success("All migrations applied successfully")
                    
            except Exception as e:
                self.add_error(
                    f"Error checking migrations: {str(e)}",
                    "Unable to verify migration status"
                )
                
        except Exception as e:
            self.add_error(
                f"Unexpected error during migration check: {str(e)}",
                "Unknown health check error"
            )
