"""add v2_golden_intervention_log table

Revision ID: 20260124_1200_add_v2_golden_intervention_log
Revises: 20260123_1500_seed_v2_roulette_grade_configs
Create Date: 2026-01-24 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260124_1200_add_v2_golden_intervention_log'
down_revision = '20260123_1500_seed_v2_roulette_grade_configs'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'v2_golden_intervention_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('v2_user.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('trigger_id', sa.String(length=50), nullable=False, index=True),
        sa.Column('trigger_condition', sa.Text(), nullable=True),
        sa.Column('action_taken', sa.String(length=100), nullable=False),
        sa.Column('user_balance_before', sa.Float(), nullable=True),
        sa.Column('session_balance_delta', sa.Float(), nullable=True),
        sa.Column('recent_results', sa.String(length=50), nullable=True),
        sa.Column('cooldown_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )


def downgrade():
    op.drop_table('v2_golden_intervention_log')
