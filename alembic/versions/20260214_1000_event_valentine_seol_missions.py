"""Event Valentine Scel Missions

Revision ID: 20260214_1000
Revises: 20260207_1900_align_golden_defaults
Create Date: 2026-02-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '20260214_1000'
down_revision = '20260207_1900_align_golden_defaults'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create event_secret_code table
    op.create_table('event_secret_code',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('event_date', sa.String(length=10), nullable=False),
        sa.Column('reward_type', sa.String(length=50), nullable=False),
        sa.Column('reward_amount', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('idx_event_secret_code_code'), 'event_secret_code', ['code'], unique=True)
    op.create_index(op.f('idx_event_secret_code_event_date'), 'event_secret_code', ['event_date'], unique=False)

    # 2. Create user_secret_code_claim table
    op.create_table('user_secret_code_claim',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret_code_id', sa.Integer(), nullable=False),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['secret_code_id'], ['event_secret_code.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['v2_user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'secret_code_id', name='uq_user_secret_code_claim')
    )
    op.create_index(op.f('idx_user_secret_code_claim_secret_code_id'), 'user_secret_code_claim', ['secret_code_id'], unique=False)
    op.create_index(op.f('idx_user_secret_code_claim_user_id'), 'user_secret_code_claim', ['user_id'], unique=False)

    # 3. Insert Secret Code Data
    op.execute("""
        INSERT INTO event_secret_code (code, event_date, reward_type, reward_amount, expires_at, created_at, updated_at) VALUES
        ('LOVE2026', '2026-02-14', 'ROULETTE_TICKET', 2, '2026-02-14 23:59:59+09', NOW(), NOW()),
        ('SEOL777', '2026-02-15', 'LOTTERY_TICKET', 1, '2026-02-15 23:59:59+09', NOW(), NOW()),
        ('LUCKY888', '2026-02-16', 'DICE_TICKET', 2, '2026-02-16 23:59:59+09', NOW(), NOW()),
        ('JACKPOT999', '2026-02-17', 'POINT', 10000, '2026-02-17 23:59:59+09', NOW(), NOW())
    """)

    # 4. Insert Mission Data
    # 2/14 Valentine
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '💝 발렌타인 럭키박스 받기',
            '오늘 로그인하고 게임 3회 플레이하면 티켓 번들 GET!',
            'SPECIAL', 'EVENT_VALENTINE_2026', 'PLAY_GAME',
            3, 'TICKET_BUNDLE', 3, 500,
            FALSE, FALSE, TRUE, TRUE,
            '2026-02-14 00:00:00', '2026-02-14 23:59:59', '00:00:00', '23:59:59', NOW()
        )
    """)

    # 2/15 Seol Day 1
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🧧 설날 세뱃돈 DAY 1 - 10만원 입금',
            '오늘 10만원 이상 입금하면 포인트 10,000P + 룰렛 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY1_2026', 'CC_DEPOSIT',
            100000, 'BUNDLE', 23, 1000,
            FALSE, FALSE, TRUE, TRUE,
            '2026-02-15 00:00:00', '2026-02-15 23:59:59', '00:00:00', '23:59:59', NOW()
        )
    """)

    # 2/16 Seol Day 2
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🎮 설날 세뱃돈 DAY 2 - 게임 즐기기',
            '오늘 게임 5회 플레이하면 골드키 + 주사위 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY2_2026', 'PLAY_GAME',
            5, 'BUNDLE', 21, 800,
            FALSE, FALSE, TRUE, TRUE,
            '2026-02-16 00:00:00', '2026-02-16 23:59:59', '00:00:00', '23:59:59', NOW()
        )
    """)

    # 2/17 Seol Day 3
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '💎 설날 세뱃돈 DAY 3 - 30만원 입금',
            '오늘 30만원 이상 입금하면 포인트 20,000P + 다이아몬드 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY3_2026', 'CC_DEPOSIT',
            300000, 'BUNDLE', 22, 1500,
            FALSE, FALSE, TRUE, TRUE,
            '2026-02-17 00:00:00', '2026-02-17 23:59:59', '00:00:00', '23:59:59', NOW()
        )
    """)

    # Streak Bonus
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🏆 4일 연속 달성 보너스',
            '2/14~2/17 모든 미션 완료 시 추가 보상!',
            'SPECIAL', 'EVENT_SEOL_STREAK_2026', 'EVENT_STREAK',
            4, 'BUNDLE', 25, 2000,
            FALSE, FALSE, TRUE, TRUE,
            '2026-02-14 00:00:00', '2026-02-17 23:59:59', '00:00:00', '23:59:59', NOW()
        )
    """)


def downgrade():
    # Remove Missions
    op.execute("""
        DELETE FROM mission WHERE logic_key IN (
            'EVENT_VALENTINE_2026',
            'EVENT_SEOL_DAY1_2026',
            'EVENT_SEOL_DAY2_2026',
            'EVENT_SEOL_DAY3_2026',
            'EVENT_SEOL_STREAK_2026'
        )
    """)

    # Remove Secret Codes (Cascades to claims if not empty, but better truncated)
    # Drop tables
    op.drop_index(op.f('idx_user_secret_code_claim_user_id'), table_name='user_secret_code_claim')
    op.drop_index(op.f('idx_user_secret_code_claim_secret_code_id'), table_name='user_secret_code_claim')
    op.drop_table('user_secret_code_claim')
    op.drop_index(op.f('idx_event_secret_code_event_date'), table_name='event_secret_code')
    op.drop_index(op.f('idx_event_secret_code_code'), table_name='event_secret_code')
    op.drop_table('event_secret_code')
