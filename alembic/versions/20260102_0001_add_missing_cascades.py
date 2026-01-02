"""Add missing cascades to vault_status.

Revision ID: 20260102_0001
Revises: 20260101_1500
Create Date: 2026-01-02

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260102_0001"
down_revision = "20260101_1500"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return table in inspector.get_table_names()


def _ensure_fk_ondelete_cascade(table: str, col: str, ref_table: str, fk_name: str) -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    fks = inspector.get_foreign_keys(table)
    target_fk = None
    for fk in fks:
        if fk.get("referred_table") != ref_table:
            continue
        if fk.get("constrained_columns") != [col]:
            continue
        target_fk = fk
        break

    if target_fk is None:
        # If it doesn't exist, we create it
        op.create_foreign_key(
            fk_name,
            source_table=table,
            referent_table=ref_table,
            local_cols=[col],
            remote_cols=["id"],
            ondelete="CASCADE",
        )
        return

    options = (target_fk.get("options") or {})
    if str(options.get("ondelete") or "").upper() == "CASCADE":
        return

    existing_name = target_fk.get("name")
    if existing_name:
        op.drop_constraint(existing_name, table, type_="foreignkey")

    op.create_foreign_key(
        fk_name,
        source_table=table,
        referent_table=ref_table,
        local_cols=[col],
        remote_cols=["id"],
        ondelete="CASCADE",
    )


def upgrade() -> None:
    if _table_exists("vault_status"):
        _ensure_fk_ondelete_cascade(
            table="vault_status",
            col="user_id",
            ref_table="user",
            fk_name="fk_vault_status_user_id_user",
        )
        _ensure_fk_ondelete_cascade(
            table="vault_status",
            col="program_id",
            ref_table="vault_program",
            fk_name="fk_vault_status_program_id_vault_program",
        )


def downgrade() -> None:
    # Downgrade logic to remove CASCADE if needed, though usually not recommended to revert delete safety.
    pass
