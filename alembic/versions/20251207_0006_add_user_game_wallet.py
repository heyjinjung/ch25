"""Add user_game_wallet for per-feature tokens

Revision ID: 20251207_0006
Revises: 20251207_0005
Create Date: 2025-12-07
"""
from alembic import op
import sqlalchemy as sa

revision = "20251207_0006"
down_revision = "20251207_0005"
branch_labels = None
depends_on = None

token_enum = sa.Enum(
    "ROULETTE_COIN",
    "DICE_TOKEN",
    "LOTTERY_TICKET",
    name="gametokentype",
)

def upgrade() -> None:
    # Create enum type explicitly for MySQL/Postgres compatibility
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect != "sqlite":
        token_enum.create(bind, checkfirst=True)

    op.create_table(
        "user_game_wallet",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token_type", token_enum, nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "token_type", name="uq_user_token_type"),
    )


def downgrade() -> None:
    op.drop_table("user_game_wallet")
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""
    if dialect != "sqlite":
        token_enum.drop(bind, checkfirst=True)
