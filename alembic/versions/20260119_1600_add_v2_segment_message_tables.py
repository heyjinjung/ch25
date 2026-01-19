"""add v2 segment and admin message tables

Revision ID: 20260119_1600
Revises: 20260119_1500
Create Date: 2026-01-19 16:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1600"
down_revision = "20260119_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_segment_rule",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("segment", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("condition_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("name", name="uq_v2_segment_rule_name"),
    )

    op.create_table(
        "v2_user_segment",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("segment", sa.String(length=50), nullable=False, server_default="NEW"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_user_segment_segment", "v2_user_segment", ["segment"])

    op.create_table(
        "v2_admin_message",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sender_admin_id", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_value", sa.String(length=255), nullable=True),
        sa.Column("channels", sa.JSON(), nullable=True),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("read_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "v2_admin_message_inbox",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("v2_admin_message.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_admin_message_inbox_user_id", "v2_admin_message_inbox", ["user_id"])
    op.create_index("ix_v2_admin_message_inbox_message_id", "v2_admin_message_inbox", ["message_id"])


def downgrade() -> None:
    op.drop_index("ix_v2_admin_message_inbox_message_id", table_name="v2_admin_message_inbox")
    op.drop_index("ix_v2_admin_message_inbox_user_id", table_name="v2_admin_message_inbox")
    op.drop_table("v2_admin_message_inbox")

    op.drop_table("v2_admin_message")

    op.drop_index("ix_v2_user_segment_segment", table_name="v2_user_segment")
    op.drop_table("v2_user_segment")

    op.drop_table("v2_segment_rule")
