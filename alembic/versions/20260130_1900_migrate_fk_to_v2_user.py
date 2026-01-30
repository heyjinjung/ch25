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
- Drop old FK constraints referencing `user.id`
- Add new FK constraints referencing `v2_user.id`
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260130_1900_fk_v2_user"
down_revision = "20260130_1800_add_v2_user_password_hash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # 1. user_game_wallet: user.id -> v2_user.id
    # =========================================================================
    # Drop old FK
    op.drop_constraint(
        "user_game_wallet_ibfk_1", "user_game_wallet", type_="foreignkey"
    )
    # Add new FK to v2_user
    op.create_foreign_key(
        "fk_user_game_wallet_v2_user",
        "user_game_wallet",
        "v2_user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # =========================================================================
    # 2. user_game_wallet_ledger: user.id -> v2_user.id
    # =========================================================================
    op.drop_constraint(
        "user_game_wallet_ledger_ibfk_1", "user_game_wallet_ledger", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_user_game_wallet_ledger_v2_user",
        "user_game_wallet_ledger",
        "v2_user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # =========================================================================
    # 3. user_inventory_item: user.id -> v2_user.id
    # =========================================================================
    op.drop_constraint(
        "user_inventory_item_ibfk_1", "user_inventory_item", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_user_inventory_item_v2_user",
        "user_inventory_item",
        "v2_user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # =========================================================================
    # 4. user_inventory_ledger: user.id -> v2_user.id
    # =========================================================================
    op.drop_constraint(
        "user_inventory_ledger_ibfk_1", "user_inventory_ledger", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_user_inventory_ledger_v2_user",
        "user_inventory_ledger",
        "v2_user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Revert to legacy user FK (for rollback)
    
    # 4. user_inventory_ledger
    op.drop_constraint(
        "fk_user_inventory_ledger_v2_user", "user_inventory_ledger", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_inventory_ledger_ibfk_1",
        "user_inventory_ledger",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 3. user_inventory_item
    op.drop_constraint(
        "fk_user_inventory_item_v2_user", "user_inventory_item", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_inventory_item_ibfk_1",
        "user_inventory_item",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 2. user_game_wallet_ledger
    op.drop_constraint(
        "fk_user_game_wallet_ledger_v2_user", "user_game_wallet_ledger", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_game_wallet_ledger_ibfk_1",
        "user_game_wallet_ledger",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 1. user_game_wallet
    op.drop_constraint(
        "fk_user_game_wallet_v2_user", "user_game_wallet", type_="foreignkey"
    )
    op.create_foreign_key(
        "user_game_wallet_ibfk_1",
        "user_game_wallet",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
