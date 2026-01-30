"""Migrate FK from legacy user to v2_user for wallet/inventory tables.

Revision ID: 20260130_1900_fk_v2_user
Revises: 20260130_1800_add_v2_user_password_hash
Create Date: 2026-01-30 19:00:00

Problem:
- user_game_wallet, user_game_wallet_ledger, user_inventory_item, user_inventory_ledger
  all reference legacy `user.id` as FK
- V2 system uses v2_user exclusively
- FK constraint fails when user exists in v2_user but not in legacy user table

Solution (Updated 2026-01-30 10:35 - Option A):
- Drop old FK constraints referencing `user.id` (if exists)
- DELETE orphan data (user_id not in v2_user)
- Create new FK to v2_user
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
    result = conn.execute(text(f"""
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND CONSTRAINT_NAME = '{constraint_name}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """)).scalar()
    
    if result > 0:
        conn.execute(text(f"ALTER TABLE {table_name} DROP FOREIGN KEY {constraint_name}"))


def _delete_orphans(conn, table_name: str) -> int:
    """Delete rows where user_id doesn't exist in v2_user."""
    result = conn.execute(text(f"""
        DELETE FROM {table_name}
        WHERE user_id NOT IN (SELECT id FROM v2_user)
    """))
    return result.rowcount


def _safe_create_fk(conn, table_name: str, constraint_name: str, ref_table: str) -> None:
    """Create FK constraint if it doesn't exist."""
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
    """Drop old FK, delete orphan data, create new FK to v2_user."""
    conn = op.get_bind()
    
    # Tables in order: ledgers first (child), then main tables
    tables = [
        ("user_game_wallet_ledger", "user_game_wallet_ledger_ibfk_1", "fk_user_game_wallet_ledger_v2_user"),
        ("user_inventory_ledger", "user_inventory_ledger_ibfk_1", "fk_user_inventory_ledger_v2_user"),
        ("user_game_wallet", "user_game_wallet_ibfk_1", "fk_user_game_wallet_v2_user"),
        ("user_inventory_item", "user_inventory_item_ibfk_1", "fk_user_inventory_item_v2_user"),
    ]
    
    for table_name, old_fk, new_fk in tables:
        # 1. Drop old FK (if exists)
        _safe_drop_fk(conn, table_name, old_fk)
        _safe_drop_fk(conn, table_name, new_fk)  # in case of partial migration
        
        # 2. Delete orphan data (user_id not in v2_user)
        deleted = _delete_orphans(conn, table_name)
        print(f"[MIGRATION] {table_name}: deleted {deleted} orphan rows")
        
        # 3. Create new FK to v2_user
        _safe_create_fk(conn, table_name, new_fk, "v2_user")


def downgrade() -> None:
    """Revert to no FK (rollback). Cannot restore deleted orphan data."""
    conn = op.get_bind()
    
    tables = [
        ("user_game_wallet", "fk_user_game_wallet_v2_user"),
        ("user_game_wallet_ledger", "fk_user_game_wallet_ledger_v2_user"),
        ("user_inventory_item", "fk_user_inventory_item_v2_user"),
        ("user_inventory_ledger", "fk_user_inventory_ledger_v2_user"),
    ]
    
    for table_name, v2_fk in tables:
        _safe_drop_fk(conn, table_name, v2_fk)
    
    # NOTE: Deleted orphan data cannot be restored
    # Legacy FK is NOT recreated (user table may not have matching IDs)
