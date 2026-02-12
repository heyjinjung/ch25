"""Event Valentine Scel Missions

Revision ID: 20260214_1000
Revises: 20260207_1900_align_golden_defaults
Create Date: 2026-02-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260214_1000'
down_revision = '20260207_1900_align_golden_defaults'
branch_labels = None
depends_on = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    try:
        indexes = inspector.get_indexes(table_name)
    except Exception:
        return False
    return any(ix.get('name') == index_name for ix in indexes)


def _safe_create_index(
    inspector: sa.Inspector,
    index_name: str,
    table_name: str,
    columns: list[str],
    *,
    unique: bool,
) -> None:
    if not _index_exists(inspector, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    event_secret_code_table = 'event_secret_code'
    user_secret_code_claim_table = 'user_secret_code_claim'

    idx_event_secret_code_code = op.f('idx_event_secret_code_code')
    idx_event_secret_code_event_date = op.f('idx_event_secret_code_event_date')
    idx_user_secret_code_claim_secret_code_id = op.f('idx_user_secret_code_claim_secret_code_id')
    idx_user_secret_code_claim_user_id = op.f('idx_user_secret_code_claim_user_id')

    # 1. Create event_secret_code table (idempotent)
    if not _table_exists(inspector, event_secret_code_table):
        op.create_table(
            event_secret_code_table,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('event_date', sa.String(length=10), nullable=False),
            sa.Column('reward_type', sa.String(length=50), nullable=False),
            sa.Column('reward_amount', sa.Integer(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )

    if _table_exists(inspector, event_secret_code_table):
        _safe_create_index(
            inspector,
            idx_event_secret_code_code,
            event_secret_code_table,
            ['code'],
            unique=True,
        )
        _safe_create_index(
            inspector,
            idx_event_secret_code_event_date,
            event_secret_code_table,
            ['event_date'],
            unique=False,
        )

    # 2. Create user_secret_code_claim table (idempotent)
    if not _table_exists(inspector, user_secret_code_claim_table):
        op.create_table(
            user_secret_code_claim_table,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('secret_code_id', sa.Integer(), nullable=False),
            sa.Column('claimed_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['secret_code_id'], ['event_secret_code.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['v2_user.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'secret_code_id', name='uq_user_secret_code_claim'),
        )

    if _table_exists(inspector, user_secret_code_claim_table):
        _safe_create_index(
            inspector,
            idx_user_secret_code_claim_secret_code_id,
            user_secret_code_claim_table,
            ['secret_code_id'],
            unique=False,
        )
        _safe_create_index(
            inspector,
            idx_user_secret_code_claim_user_id,
            user_secret_code_claim_table,
            ['user_id'],
            unique=False,
        )

    # 3. Insert Secret Code Data
    op.execute("""
        INSERT INTO event_secret_code (code, event_date, reward_type, reward_amount, is_active, expires_at, created_at, updated_at) VALUES
        ('LOVE2026', '2026-02-14', 'ROULETTE_TICKET', 2, 1, '2026-02-14 23:59:59+09:00', NOW(), NOW()),
        ('SEOL777', '2026-02-15', 'LOTTERY_TICKET', 1, 1, '2026-02-15 23:59:59+09:00', NOW(), NOW()),
        ('LUCKY888', '2026-02-16', 'DICE_TICKET', 2, 1, '2026-02-16 23:59:59+09:00', NOW(), NOW()),
        ('JACKPOT999', '2026-02-17', 'POINT', 10000, 1, '2026-02-17 23:59:59+09:00', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            event_date = VALUES(event_date),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            is_active = VALUES(is_active),
            expires_at = VALUES(expires_at),
            updated_at = NOW()
    """)

    # 4. Insert Mission Data
    # 2/14 Valentine
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '💝 발렌타인 럭키박스 받기',
            '오늘 로그인하고 게임 3회 플레이하면 티켓 번들 GET!',
            'SPECIAL', 'EVENT_VALENTINE_2026', 'PLAY_GAME',
            3, 'TICKET_BUNDLE', 3, 500,
            FALSE, FALSE, TRUE,
            '2026-02-14 00:00:00', '2026-02-14 23:59:59', '00:00:00', '23:59:59', NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category),
            action_type = VALUES(action_type),
            target_value = VALUES(target_value),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            xp_reward = VALUES(xp_reward),
            requires_approval = VALUES(requires_approval),
            auto_claim = VALUES(auto_claim),
            is_active = VALUES(is_active),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time)
    """)

    # 2/15 Seol Day 1
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🧧 설날 세뱃돈 DAY 1 - 10만원 입금',
            '오늘 10만원 이상 입금하면 포인트 10,000P + 룰렛 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY1_2026', 'CC_DEPOSIT',
            100000, 'BUNDLE', 23, 1000,
            FALSE, FALSE, TRUE,
            '2026-02-15 00:00:00', '2026-02-15 23:59:59', '00:00:00', '23:59:59', NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category),
            action_type = VALUES(action_type),
            target_value = VALUES(target_value),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            xp_reward = VALUES(xp_reward),
            requires_approval = VALUES(requires_approval),
            auto_claim = VALUES(auto_claim),
            is_active = VALUES(is_active),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time)
    """)

    # 2/16 Seol Day 2
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🎮 설날 세뱃돈 DAY 2 - 게임 즐기기',
            '오늘 게임 5회 플레이하면 골드키 + 주사위 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY2_2026', 'PLAY_GAME',
            5, 'BUNDLE', 21, 800,
            FALSE, FALSE, TRUE,
            '2026-02-16 00:00:00', '2026-02-16 23:59:59', '00:00:00', '23:59:59', NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category),
            action_type = VALUES(action_type),
            target_value = VALUES(target_value),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            xp_reward = VALUES(xp_reward),
            requires_approval = VALUES(requires_approval),
            auto_claim = VALUES(auto_claim),
            is_active = VALUES(is_active),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time)
    """)

    # 2/17 Seol Day 3
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '💎 설날 세뱃돈 DAY 3 - 30만원 입금',
            '오늘 30만원 이상 입금하면 포인트 20,000P + 다이아몬드 티켓!',
            'SPECIAL', 'EVENT_SEOL_DAY3_2026', 'CC_DEPOSIT',
            300000, 'BUNDLE', 22, 1500,
            FALSE, FALSE, TRUE,
            '2026-02-17 00:00:00', '2026-02-17 23:59:59', '00:00:00', '23:59:59', NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category),
            action_type = VALUES(action_type),
            target_value = VALUES(target_value),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            xp_reward = VALUES(xp_reward),
            requires_approval = VALUES(requires_approval),
            auto_claim = VALUES(auto_claim),
            is_active = VALUES(is_active),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time)
    """)

    # Streak Bonus
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active,
            start_date, end_date, start_time, end_time, created_at
        ) VALUES (
            '🏆 4일 연속 달성 보너스',
            '2/14~2/17 모든 미션 완료 시 추가 보상!',
            'SPECIAL', 'EVENT_SEOL_STREAK_2026', 'EVENT_STREAK',
            4, 'BUNDLE', 25, 2000,
            FALSE, FALSE, TRUE,
            '2026-02-14 00:00:00', '2026-02-17 23:59:59', '00:00:00', '23:59:59', NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category),
            action_type = VALUES(action_type),
            target_value = VALUES(target_value),
            reward_type = VALUES(reward_type),
            reward_amount = VALUES(reward_amount),
            xp_reward = VALUES(xp_reward),
            requires_approval = VALUES(requires_approval),
            auto_claim = VALUES(auto_claim),
            is_active = VALUES(is_active),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time)
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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    event_secret_code_table = 'event_secret_code'
    user_secret_code_claim_table = 'user_secret_code_claim'

    idx_event_secret_code_code = op.f('idx_event_secret_code_code')
    idx_event_secret_code_event_date = op.f('idx_event_secret_code_event_date')
    idx_user_secret_code_claim_secret_code_id = op.f('idx_user_secret_code_claim_secret_code_id')
    idx_user_secret_code_claim_user_id = op.f('idx_user_secret_code_claim_user_id')

    # Drop tables (best-effort for partially applied migrations)
    if _table_exists(inspector, user_secret_code_claim_table):
        if _index_exists(inspector, user_secret_code_claim_table, idx_user_secret_code_claim_user_id):
            op.drop_index(idx_user_secret_code_claim_user_id, table_name=user_secret_code_claim_table)
        if _index_exists(inspector, user_secret_code_claim_table, idx_user_secret_code_claim_secret_code_id):
            op.drop_index(idx_user_secret_code_claim_secret_code_id, table_name=user_secret_code_claim_table)
        op.drop_table(user_secret_code_claim_table)

    if _table_exists(inspector, event_secret_code_table):
        if _index_exists(inspector, event_secret_code_table, idx_event_secret_code_event_date):
            op.drop_index(idx_event_secret_code_event_date, table_name=event_secret_code_table)
        if _index_exists(inspector, event_secret_code_table, idx_event_secret_code_code):
            op.drop_index(idx_event_secret_code_code, table_name=event_secret_code_table)
        op.drop_table(event_secret_code_table)
