"""Add team battle core tables.

Revision ID: 20251212_0011
Revises: 20251212_0010
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa

revision = "20251212_0011"
down_revision = "20251212_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "team_season",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("rewards_schema", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("name", name="uq_team_season_name"),
        sa.Index("idx_team_season_active", "is_active"),
        sa.Index("idx_team_season_time", "starts_at", "ends_at"),
    )

    op.create_table(
        "team",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("icon", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("name", name="uq_team_name"),
    )

    op.create_table(
        "team_member",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=10), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Index("idx_team_member_team", "team_id"),
    )

    op.create_table(
        "team_score",
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("season_id", sa.Integer(), sa.ForeignKey("team_season.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("points", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("team_id", "season_id", name="uq_team_score"),
        sa.Index("idx_team_score_points", "season_id", "points"),
    )

    op.create_table(
        "team_event_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("season_id", sa.Integer(), sa.ForeignKey("team_season.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Index("idx_tel_season_team", "season_id", "team_id", "created_at"),
        sa.Index("idx_tel_user", "user_id"),
    )


def downgrade() -> None:
    op.drop_table("team_event_log")
    op.drop_table("team_score")
    op.drop_table("team_member")
    op.drop_table("team")
    op.drop_table("team_season")
