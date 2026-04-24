"""
Custom health checks to ensure migrations are applied and database is ready.
"""

from django.core.management import call_command
from django.db import connections
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
            # Get the default database
            db = connections['default']
            
            # Verify database connection
            db.ensure_connection()
            
            # Check for pending migrations
            from django.core.management.sql import emit_post_migrate_signal
            from django.db.migrations.executor import MigrationExecutor
            from django.db.migrations.loader import MigrationLoader
            
            executor = MigrationExecutor(db)
            loader = MigrationLoader(db)
            
            # Get pending migrations
            targets = executor.loader.graph.leaf_nodes()
            pending = executor.migration_plan(targets)
            
            if pending:
                # There are pending migrations
                self.add_error(
                    f"Database has {len(pending)} pending migration(s)",
                    "Migrations are not yet applied"
                )
            else:
                # All migrations are applied
                self.add_success("All migrations applied successfully")
                
        except Exception as e:
            self.add_error(
                f"Migration check failed: {str(e)}",
                "Unable to check migration status"
            )
