"""Add event_config and event_participation_log tables

Revision ID: 20260115_0900_add_event_config
Revises: 35f8c3708f2f
Create Date: 2026-01-15 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = "20260115_0900_add_event_config"
down_revision = "35f8c3708f2f"
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
    if not _table_exists("event_config"):
        op.create_table(
            "event_config",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("event_type", sa.String(length=50), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("multiplier", sa.Float(), nullable=True),
            sa.Column("start_time", sa.Time(), nullable=True),
            sa.Column("end_time", sa.Time(), nullable=True),
            sa.Column("target_segment", sa.String(length=50), nullable=True),
            sa.Column("config_json", sa.JSON().with_variant(mysql.JSON, "mysql"), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

    if not _index_exists("event_config", "ix_event_config_type_active"):
        op.create_index(
            "ix_event_config_type_active",
            "event_config",
            ["event_type", "is_active"],
            unique=False,
        )
    if not _index_exists("event_config", "ix_event_config_target_segment"):
        op.create_index(
            "ix_event_config_target_segment",
            "event_config",
            ["target_segment"],
            unique=False,
        )

    if not _table_exists("event_participation_log"):
        op.create_table(
            "event_participation_log",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=True),
            sa.Column("event_type", sa.String(length=50), nullable=True),
            sa.Column("participated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("reward_type", sa.String(length=50), nullable=True),
            sa.Column("reward_amount", sa.Integer(), nullable=True),
            sa.Column("meta_json", sa.JSON().with_variant(mysql.JSON, "mysql"), nullable=True),
        )
        op.create_foreign_key(
            "fk_event_participation_user",
            "event_participation_log",
            "user",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_foreign_key(
            "fk_event_participation_event",
            "event_participation_log",
            "event_config",
            ["event_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if not _index_exists("event_participation_log", "ix_event_participation_user"):
        op.create_index(
            "ix_event_participation_user",
            "event_participation_log",
            ["user_id"],
            unique=False,
        )
    if not _index_exists("event_participation_log", "ix_event_participation_event"):
        op.create_index(
            "ix_event_participation_event",
            "event_participation_log",
            ["event_id"],
            unique=False,
        )
    if not _index_exists("event_participation_log", "ix_event_participation_time"):
        op.create_index(
            "ix_event_participation_time",
            "event_participation_log",
            ["participated_at"],
            unique=False,
        )
    if not _index_exists("event_participation_log", "ix_event_participation_type"):
        op.create_index(
            "ix_event_participation_type",
            "event_participation_log",
            ["event_type"],
            unique=False,
        )


def downgrade() -> None:
    if _table_exists("event_participation_log"):
        op.drop_table("event_participation_log")
    if _table_exists("event_config"):
        op.drop_table("event_config")
