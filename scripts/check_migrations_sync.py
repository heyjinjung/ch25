import sys
import os
import argparse
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.base import Base  # Ensure models are loaded

def check_migrations_sync():
    print("Checking if models and migrations are in sync...")
    
    alembic_cfg = Config("alembic.ini")
    
    # Custom directive handler to trap changes
    def process_revision_directives(context, revision, directives):
        script = directives[0]
        # If there are changes (upgrade_ops is not empty)
        if script.upgrade_ops.is_empty():
            print("[OK] No schema changes detected. Models are in sync with migrations.")
            # Verify we are at head? (Optional, but good practice is checking current vs head)
            # But the primary goal here is "do models have changes not in ANY migration?"
        else:
            print("[FAIL] Schema changes detected! You have modified models without creating a migration.")
            print("Detected changes:")
            # Use specific print mechanism if needed, or just let user know
            # For simplicity, we just dump what we found roughly or just exit
            import pprint
            pprint.pprint(script.upgrade_ops)
            print("\nRun 'alembic revision --autogenerate -m \"description\"' to create a migration.")
            sys.exit(1)
            
    # We hijack the 'revision' command with autogenerate=True
    # But we don't want to actually write a file.
    # We pass our custom process_revision_directives
    
    try:
        command.revision(
            alembic_cfg,
            autogenerate=True,
            process_revision_directives=process_revision_directives
        )
    except SystemExit as e:
        if e.code != 0:
            raise
    except Exception as e:
        print(f"Error during check: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_migrations_sync()
