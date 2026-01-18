"""add_point_reward_type

Revision ID: 8ff0ec49f5ea
Revises: 20260115_0910_seed_event_config_defaults
Create Date: 2026-01-15 22:59:24.219467+09:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '8ff0ec49f5ea'
down_revision = '20260115_0910_seed_event_config_defaults'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Manual update for MySQL Enum
    # Note: Alembic autogenerate often misses explicit ENUM value updates in MySQL.
    # We use raw SQL to ensure 'POINT' is added.
    op.execute("ALTER TABLE mission MODIFY COLUMN reward_type ENUM('NONE', 'DIAMOND', 'GOLD_KEY', 'DIAMOND_KEY', 'CASH_UNLOCK', 'TICKET_BUNDLE', 'TICKET_ROULETTE', 'TICKET_LOTTERY', 'TICKET_DICE', 'POINT') NOT NULL")


def downgrade() -> None:
    # Warning: Removing 'POINT' will fail if there are rows with 'POINT' value.
    op.execute("ALTER TABLE mission MODIFY COLUMN reward_type ENUM('NONE', 'DIAMOND', 'GOLD_KEY', 'DIAMOND_KEY', 'CASH_UNLOCK', 'TICKET_BUNDLE', 'TICKET_ROULETTE', 'TICKET_LOTTERY', 'TICKET_DICE') NOT NULL")
