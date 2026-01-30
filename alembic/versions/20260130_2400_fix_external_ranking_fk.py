"""Fix FK for external_ranking_daily_deposit_delta to reference v2_user.

Revision ID: 20260130_2400_fix_external_ranking_fk
Revises: 20260130_2300_seed_system_config
Create Date: 2026-01-30

Problem:
- external_ranking_daily_deposit_delta.user_id references user.id
- V2 system uses v2_user exclusively
- Causes IntegrityError 1452 when inserting with v2_user.id

Solution:
- Drop old FK constraint
- Create new FK referencing v2_user.id
"""
from alembic import op
import sqlalchemy as sa


revision = "20260130_2400_fix_external_ranking_fk"
down_revision = "20260130_2300_seed_system_config"
branch_labels = None
depends_on = None


def _get_fk_name(conn, table: str, column: str) -> str | None:
    """Get the FK constraint name for a given table and column."""
    result = conn.execute(sa.text("""
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
          AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    """), {"table": table, "column": column})
    row = result.fetchone()
    return row[0] if row else None


def _safe_drop_fk(conn, table: str, fk_name: str) -> None:
    """Drop FK if it exists."""
    if not fk_name:
        return
    try:
        conn.execute(sa.text(f"ALTER TABLE {table} DROP FOREIGN KEY {fk_name}"))
        print(f"[FK] Dropped {table}.{fk_name}")
    except Exception as e:
        print(f"[FK] Could not drop {table}.{fk_name}: {e}")


def _safe_create_fk(conn, table: str, fk_name: str, column: str, ref_table: str, ref_column: str) -> None:
    """Create FK if it doesn't exist."""
    # Check if FK already exists
    existing = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND CONSTRAINT_NAME = :fk_name
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """), {"table": table, "fk_name": fk_name}).fetchone()
    
    if existing:
        print(f"[FK] {fk_name} already exists on {table}")
        return
    
    try:
        conn.execute(sa.text(f"""
            ALTER TABLE {table}
            ADD CONSTRAINT {fk_name}
            FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column})
            ON DELETE CASCADE
        """))
        print(f"[FK] Created {table}.{fk_name} -> {ref_table}.{ref_column}")
    except Exception as e:
        print(f"[FK] Could not create {fk_name}: {e}")


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. external_ranking_daily_deposit_delta
    table = "external_ranking_daily_deposit_delta"
    fk_name = _get_fk_name(conn, table, "user_id")
    _safe_drop_fk(conn, table, fk_name)
    _safe_create_fk(conn, table, f"{table}_fk_v2_user", "user_id", "v2_user", "id")
    
    # 2. external_ranking_data
    table = "external_ranking_data"
    fk_name = _get_fk_name(conn, table, "user_id")
    _safe_drop_fk(conn, table, fk_name)
    _safe_create_fk(conn, table, f"{table}_fk_v2_user", "user_id", "v2_user", "id")
    
    # 3. external_ranking_reward_log
    table = "external_ranking_reward_log"
    fk_name = _get_fk_name(conn, table, "user_id")
    _safe_drop_fk(conn, table, fk_name)
    _safe_create_fk(conn, table, f"{table}_fk_v2_user", "user_id", "v2_user", "id")
    
    print("[MIGRATION] External ranking FK migration complete")


def downgrade() -> None:
    conn = op.get_bind()
    
    # Revert to user table FK
    tables = [
        "external_ranking_daily_deposit_delta",
        "external_ranking_data", 
        "external_ranking_reward_log"
    ]
    
    for table in tables:
        fk_name = _get_fk_name(conn, table, "user_id")
        _safe_drop_fk(conn, table, fk_name)
        _safe_create_fk(conn, table, f"{table}_ibfk_1", "user_id", "user", "id")
    
    print("[MIGRATION] External ranking FK downgrade complete")
