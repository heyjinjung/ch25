"""Add CRM models

Revision ID: 2e5c3b701c31
Revises: 20251225_0006
Create Date: 2025-12-27 18:48:13.007609+09:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '2e5c3b701c31'
down_revision = '20251225_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Admin User Profile
    op.create_table('admin_user_profile',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(length=100), nullable=True),
        sa.Column('real_name', sa.String(length=100), nullable=True),
        sa.Column('phone_number', sa.String(length=50), nullable=True),
        sa.Column('telegram_id', sa.String(length=100), nullable=True),
        sa.Column('tags', mysql.JSON(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_admin_user_profile_external_id'), 'admin_user_profile', ['external_id'], unique=False)
    op.create_index(op.f('ix_admin_user_profile_telegram_id'), 'admin_user_profile', ['telegram_id'], unique=False)

    # 2. Admin Message
    op.create_table('admin_message',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_admin_id', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_value', sa.String(length=255), nullable=True),
        sa.Column('channels', mysql.JSON(), nullable=True),
        sa.Column('recipient_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('read_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_message_id'), 'admin_message', ['id'], unique=False)

    # 3. Admin Message Inbox
    op.create_table('admin_message_inbox',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['admin_message.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_message_inbox_id'), 'admin_message_inbox', ['id'], unique=False)
    op.create_index(op.f('ix_admin_message_inbox_message_id'), 'admin_message_inbox', ['message_id'], unique=False)
    op.create_index(op.f('ix_admin_message_inbox_user_id'), 'admin_message_inbox', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_message_inbox_user_id'), table_name='admin_message_inbox')
    op.drop_index(op.f('ix_admin_message_inbox_message_id'), table_name='admin_message_inbox')
    op.drop_index(op.f('ix_admin_message_inbox_id'), table_name='admin_message_inbox')
    op.drop_table('admin_message_inbox')
    
    op.drop_index(op.f('ix_admin_message_id'), table_name='admin_message')
    op.drop_table('admin_message')
    
    op.drop_index(op.f('ix_admin_user_profile_telegram_id'), table_name='admin_user_profile')
    op.drop_index(op.f('ix_admin_user_profile_external_id'), table_name='admin_user_profile')
    op.drop_table('admin_user_profile')
