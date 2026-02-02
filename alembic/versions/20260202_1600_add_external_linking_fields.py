"""Add external linking fields to v2_user and hq_prospective_user

Revision ID: 20260202_1600_add_external_linking_fields
Revises: 20260202_1400_add_v2_game_log
Create Date: 2026-02-02 16:00:00+09:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260202_1600_add_external_linking_fields'
down_revision = ('20260202_1315_add_missing_v2_user_columns', '20260202_1400_add_v2_game_log')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add external linking fields for user-prospect matching."""
    
    # V2User: 외부 플랫폼 연동 필드
    op.add_column('v2_user', sa.Column('external_nickname', sa.String(100), nullable=True))
    op.add_column('v2_user', sa.Column('external_linked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('v2_user', sa.Column('hq_segment', sa.String(50), nullable=True))
    op.create_index('ix_v2_user_external_nickname', 'v2_user', ['external_nickname'], unique=False)
    
    # HQProspectiveUser: 연결/무시 상태 필드
    op.add_column('hq_prospective_user', sa.Column('linked_user_id', sa.Integer(), nullable=True))
    op.add_column('hq_prospective_user', sa.Column('linked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('hq_prospective_user', sa.Column('ignored', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('hq_prospective_user', sa.Column('ignored_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('hq_prospective_user', sa.Column('ignored_reason', sa.String(200), nullable=True))
    
    op.create_index('ix_hq_prospective_user_linked_user_id', 'hq_prospective_user', ['linked_user_id'], unique=False)
    op.create_index('ix_hq_prospective_user_ignored', 'hq_prospective_user', ['ignored'], unique=False)
    op.create_foreign_key(
        'fk_hq_prospective_user_linked_user_id', 
        'hq_prospective_user', 
        'v2_user', 
        ['linked_user_id'], 
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove external linking fields."""
    op.drop_constraint('fk_hq_prospective_user_linked_user_id', 'hq_prospective_user', type_='foreignkey')
    op.drop_index('ix_hq_prospective_user_ignored', table_name='hq_prospective_user')
    op.drop_index('ix_hq_prospective_user_linked_user_id', table_name='hq_prospective_user')
    op.drop_column('hq_prospective_user', 'ignored_reason')
    op.drop_column('hq_prospective_user', 'ignored_at')
    op.drop_column('hq_prospective_user', 'ignored')
    op.drop_column('hq_prospective_user', 'linked_at')
    op.drop_column('hq_prospective_user', 'linked_user_id')
    
    op.drop_index('ix_v2_user_external_nickname', table_name='v2_user')
    op.drop_column('v2_user', 'hq_segment')
    op.drop_column('v2_user', 'external_linked_at')
    op.drop_column('v2_user', 'external_nickname')
