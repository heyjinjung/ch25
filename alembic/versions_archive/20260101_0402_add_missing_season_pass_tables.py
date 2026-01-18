"""Add missing season pass tables

Revision ID: 20260101_0402
Revises: 8f568c60bb17
Create Date: 2026-01-01 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '20260101_0402'
down_revision = '8f568c60bb17'  # Inventory models
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    # 1. season_pass_config
    if 'season_pass_config' not in tables:
        op.create_table(
            'season_pass_config',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('season_name', sa.String(length=100), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('max_level', sa.Integer(), nullable=False),
            sa.Column('base_xp_per_stamp', sa.Integer(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('season_name', name='uq_season_name'),
            sa.CheckConstraint('start_date <= end_date', name='ck_season_dates_order')
        )
        op.create_index(op.f('ix_season_pass_config_id'), 'season_pass_config', ['id'], unique=False)
        op.create_index(op.f('ix_season_pass_config_start_date'), 'season_pass_config', ['start_date'], unique=False)
        op.create_index(op.f('ix_season_pass_config_end_date'), 'season_pass_config', ['end_date'], unique=False)
        op.create_index(op.f('ix_season_pass_config_is_active'), 'season_pass_config', ['is_active'], unique=False)

    # 2. season_pass_level
    if 'season_pass_level' not in tables and 'season_pass_levels' not in tables: # Check both plurals just in case
        op.create_table(
            'season_pass_level',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('season_id', sa.Integer(), nullable=False),
            sa.Column('level', sa.Integer(), nullable=False),
            sa.Column('required_xp', sa.Integer(), nullable=False),
            sa.Column('reward_type', sa.String(length=50), nullable=False),
            sa.Column('reward_amount', sa.Integer(), nullable=False),
            sa.Column('auto_claim', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['season_id'], ['season_pass_config.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('season_id', 'level', name='uq_season_level')
        )
        op.create_index(op.f('ix_season_pass_level_id'), 'season_pass_level', ['id'], unique=False)

    # 3. season_pass_progress
    if 'season_pass_progress' not in tables:
        op.create_table(
            'season_pass_progress',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('season_id', sa.Integer(), nullable=False),
            sa.Column('current_level', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('current_xp', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_stamps', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('last_stamp_date', sa.Date(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['season_id'], ['season_pass_config.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', 'season_id', name='uq_user_season_progress')
        )
        op.create_index(op.f('ix_season_pass_progress_id'), 'season_pass_progress', ['id'], unique=False)

    # 4. season_pass_stamp_log
    if 'season_pass_stamp_log' not in tables:
        op.create_table(
            'season_pass_stamp_log',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('season_id', sa.Integer(), nullable=False),
            sa.Column('progress_id', sa.Integer(), nullable=True),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('period_key', sa.String(length=32), nullable=False, server_default=''),
            sa.Column('stamp_count', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('source_feature_type', sa.String(length=30), nullable=False),
            sa.Column('xp_earned', sa.Integer(), nullable=False),
            sa.Column('reward_type', sa.String(length=50), nullable=False, server_default='XP'),
            sa.Column('reward_amount', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['season_id'], ['season_pass_config.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['progress_id'], ['season_pass_progress.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', 'season_id', 'source_feature_type', 'period_key', name='uq_stamp_user_season_period')
        )
        op.create_index(op.f('ix_season_pass_stamp_log_id'), 'season_pass_stamp_log', ['id'], unique=False)

    # 5. season_pass_reward_log
    if 'season_pass_reward_log' not in tables:
        op.create_table(
            'season_pass_reward_log',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('season_id', sa.Integer(), nullable=False),
            sa.Column('progress_id', sa.Integer(), nullable=True),
            sa.Column('level', sa.Integer(), nullable=False),
            sa.Column('reward_type', sa.String(length=50), nullable=False),
            sa.Column('reward_amount', sa.Integer(), nullable=False),
            sa.Column('claimed_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['season_id'], ['season_pass_config.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['progress_id'], ['season_pass_progress.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', 'season_id', 'level', name='uq_reward_user_season_level')
        )
        op.create_index(op.f('ix_season_pass_reward_log_id'), 'season_pass_reward_log', ['id'], unique=False)


def downgrade():
    # We generally don't drop tables in downgrade for safety, 
    # but strictly speaking we should if we created them.
    # Given the conditional creation, dropping is tricky without checks.
    # For now, we skip dropping to avoid accidental data loss if they existed before.
    pass
