"""Fix inventory user FK cascade.

Revision ID: 20260101_1500
Revises: 20260101_1405
Create Date: 2026-01-01

This migration aligns DB foreign keys with SQLAlchemy models:
- user_inventory_item.user_id -> user.id ON DELETE CASCADE
- user_inventory_ledger.user_id -> user.id ON DELETE CASCADE

Without this, user deletion may fail due to FK constraints.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260101_1500"
down_revision = "20260101_1405"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return table in inspector.get_table_names()


def _ensure_user_fk_ondelete_cascade(table: str, fk_name: str) -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    fks = inspector.get_foreign_keys(table)
    target_fk = None
    for fk in fks:
        if fk.get("referred_table") != "user":
            continue
        if fk.get("constrained_columns") != ["user_id"]:
            continue
        if fk.get("referred_columns") != ["id"]:
            continue
        target_fk = fk
        break

    if target_fk is None:
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
        referent_table="user",
        local_cols=["user_id"],
        remote_cols=["id"],
        ondelete="CASCADE",
    )


def _ensure_user_fk_no_ondelete(table: str, fk_name: str) -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    fks = inspector.get_foreign_keys(table)
    target_fk = None
    for fk in fks:
        if fk.get("referred_table") != "user":
            continue
        if fk.get("constrained_columns") != ["user_id"]:
            continue
        if fk.get("referred_columns") != ["id"]:
            continue
        target_fk = fk
        break

    if target_fk is None:
        return

    existing_name = target_fk.get("name")
    if existing_name:
        op.drop_constraint(existing_name, table, type_="foreignkey")

    op.create_foreign_key(
        fk_name,
        source_table=table,
        referent_table="user",
        local_cols=["user_id"],
        remote_cols=["id"],
        ondelete=None,
    )


def upgrade() -> None:
    if _table_exists("user_inventory_item"):
        _ensure_user_fk_ondelete_cascade(
            table="user_inventory_item",
            fk_name="fk_user_inventory_item_user_id_user",
        )

    if _table_exists("user_inventory_ledger"):
        _ensure_user_fk_ondelete_cascade(
            table="user_inventory_ledger",
            fk_name="fk_user_inventory_ledger_user_id_user",
        )


def downgrade() -> None:
    if _table_exists("user_inventory_item"):
        _ensure_user_fk_no_ondelete(
            table="user_inventory_item",
            fk_name="fk_user_inventory_item_user_id_user",
        )

    if _table_exists("user_inventory_ledger"):
        _ensure_user_fk_no_ondelete(
            table="user_inventory_ledger",
            fk_name="fk_user_inventory_ledger_user_id_user",
        )
