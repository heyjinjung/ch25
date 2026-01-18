"""Add user_idempotency_key table.

Revision ID: 20260101_1405
Revises: 20260101_1300
Create Date: 2026-01-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20260101_1405"
down_revision = "20260101_1300"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                """
            ),
            {"table": table},
        ).scalar()
    )


def upgrade() -> None:
    if _table_exists("user_idempotency_key"):
        return

    op.create_table(
        "user_idempotency_key",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("scope", sa.String(length=50), nullable=False, index=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("request_json", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'IN_PROGRESS'"), index=True),
        sa.Column("response_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("user_id", "scope", "idempotency_key", name="uq_user_idempotency_key_user_scope_key"),
    )

    op.create_index(
        "ix_user_idempotency_key_user_scope_created",
        "user_idempotency_key",
        ["user_id", "scope", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    if _table_exists("user_idempotency_key"):
        op.drop_index("ix_user_idempotency_key_user_scope_created", table_name="user_idempotency_key")
        op.drop_table("user_idempotency_key")
