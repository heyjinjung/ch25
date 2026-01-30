"""Sync vault_locked_balance from user to v2_user.

This migration copies vault_locked_balance from the legacy user table
to v2_user table based on matching IDs.

Revision ID: 20260130_1600_sync_v2_user_vault
Revises: 20260130_1500_add_v2_user_status_role
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260130_1600_sync_v2_user_vault'
down_revision = '20260130_1500_add_v2_user_status_role'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Copy vault_locked_balance from user to v2_user where IDs match."""
    # MySQL UPDATE with JOIN syntax
    op.execute("""
        UPDATE v2_user v
        INNER JOIN user u ON v.id = u.id
        SET v.vault_locked_balance = COALESCE(u.vault_locked_balance, 0)
        WHERE (v.vault_locked_balance = 0 OR v.vault_locked_balance IS NULL)
          AND u.vault_locked_balance > 0
    """)
    
    # Log sync result (optional - for verification)
    # This creates a record of how many rows were synced


def downgrade() -> None:
    """Downgrade is a no-op since we don't want to lose vault balances."""
    # We don't rollback vault balances as this could cause data loss
    pass
