"""add v2 ticket conversion policy

Revision ID: 20260119_1100
Revises: 20260119_1000
Create Date: 2026-01-19 11:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1100"
down_revision = "20260119_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_ticket_conversion_policy",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("target_ticket_type", sa.String(length=50), nullable=False),
        sa.Column("ratio_numerator", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ratio_denominator", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("v2_ticket_conversion_policy")
