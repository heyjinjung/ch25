"""Migrate FK from legacy user to v2_user for wallet/inventory tables.

Revision ID: 20260130_1900_fk_v2_user
Revises: 20260130_1800_add_v2_user_password_hash
Create Date: 2026-01-30 19:00:00

Problem:
- user_game_wallet, user_game_wallet_ledger, user_inventory_item, user_inventory_ledger
  all reference legacy `user.id` as FK
- V2 system uses v2_user exclusively
- FK constraint fails when user exists in v2_user but not in legacy user table

Solution:
- Drop old FK constraints referencing `user.id` (if exists)
- Add new FK constraints referencing `v2_user.id`
"""
from alembic import op
from alembic import context
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "20260130_1900_fk_v2_user"
down_revision = "20260130_1800_add_v2_user_password_hash"
branch_labels = None
depends_on = None


def _safe_drop_fk(conn, table_name: str, constraint_name: str) -> None:
    """Drop FK constraint if it exists (MySQL safe)."""
    # Check if constraint exists
    result = conn.execute(text(f"""
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND CONSTRAINT_NAME = '{constraint_name}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """)).scalar()
    
    if result > 0:
        conn.execute(text(f"ALTER TABLE {table_name} DROP FOREIGN KEY {constraint_name}"))


def _safe_create_fk(conn, table_name: str, constraint_name: str, ref_table: str) -> None:
    """Create FK constraint if it doesn't exist."""
    # Check if constraint already exists
    result = conn.execute(text(f"""
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND CONSTRAINT_NAME = '{constraint_name}'
    """)).scalar()
    
    if result == 0:
        conn.execute(text(f"""
            ALTER TABLE {table_name}
            ADD CONSTRAINT {constraint_name}
            FOREIGN KEY (user_id) REFERENCES {ref_table}(id) ON DELETE CASCADE
        """))


def upgrade() -> None:
    conn = op.get_bind()
    
    # List of tables and their old/new FK constraint names
    tables = [
        ("user_game_wallet", "user_game_wallet_ibfk_1", "fk_user_game_wallet_v2_user"),
        ("user_game_wallet_ledger", "user_game_wallet_ledger_ibfk_1", "fk_user_game_wallet_ledger_v2_user"),
        ("user_inventory_item", "user_inventory_item_ibfk_1", "fk_user_inventory_item_v2_user"),
        ("user_inventory_ledger", "user_inventory_ledger_ibfk_1", "fk_user_inventory_ledger_v2_user"),
    ]
    
    for table_name, old_fk, new_fk in tables:
        # Drop old FK (if exists)
        _safe_drop_fk(conn, table_name, old_fk)
        # Also try to drop new FK in case of partial migration
        _safe_drop_fk(conn, table_name, new_fk)
        # Create new FK to v2_user
        _safe_create_fk(conn, table_name, new_fk, "v2_user")


def downgrade() -> None:
    """Revert to legacy user FK (for rollback)."""
    conn = op.get_bind()
    
    tables = [
        ("user_game_wallet", "fk_user_game_wallet_v2_user", "user_game_wallet_ibfk_1"),
        ("user_game_wallet_ledger", "fk_user_game_wallet_ledger_v2_user", "user_game_wallet_ledger_ibfk_1"),
        ("user_inventory_item", "fk_user_inventory_item_v2_user", "user_inventory_item_ibfk_1"),
        ("user_inventory_ledger", "fk_user_inventory_ledger_v2_user", "user_inventory_ledger_ibfk_1"),
    ]
    
    for table_name, v2_fk, legacy_fk in tables:
        _safe_drop_fk(conn, table_name, v2_fk)
        _safe_create_fk(conn, table_name, legacy_fk, "user")
