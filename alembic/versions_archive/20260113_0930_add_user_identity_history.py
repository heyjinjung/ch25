"""add user identity history

Revision ID: 20260113_0930_add_user_identity_history
Revises: 202601130900_ops_plan_tables
Create Date: 2026-01-13 09:30:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260113_0930_add_user_identity_history"
down_revision = "202601130900_ops_plan_tables"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return bool(inspector.has_table(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    try:
        indexes = inspector.get_indexes(table_name)
    except Exception:
        return False
    return any(idx.get("name") == index_name for idx in indexes)


def upgrade() -> None:
    if not _table_exists("user_identity_history"):
        op.create_table(
            "user_identity_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
            sa.Column("field_name", sa.String(length=50), nullable=False),
            sa.Column("old_value", sa.String(length=255), nullable=True),
            sa.Column("new_value", sa.String(length=255), nullable=True),
            sa.Column("changed_by", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            mysql_engine="InnoDB",
            mysql_charset="utf8mb4",
        )

    idx_user_id = op.f("ix_user_identity_history_user_id")
    if not _index_exists("user_identity_history", idx_user_id) and not _index_exists(
        "user_identity_history", "ix_user_identity_history_user_id"
    ):
        op.create_index(idx_user_id, "user_identity_history", ["user_id"], unique=False)


def downgrade() -> None:
    idx_user_id = op.f("ix_user_identity_history_user_id")
    if _table_exists("user_identity_history"):
        if _index_exists("user_identity_history", idx_user_id):
            op.drop_index(idx_user_id, table_name="user_identity_history")
        elif _index_exists("user_identity_history", "ix_user_identity_history_user_id"):
            op.drop_index("ix_user_identity_history_user_id", table_name="user_identity_history")

        op.drop_table("user_identity_history")
