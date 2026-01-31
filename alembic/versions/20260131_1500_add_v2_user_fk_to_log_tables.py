"""Add v2_user FK to log/order tables for data integrity.

Revision ID: 20260131_1500_add_v2_user_fk_to_log_tables
Revises: 20260130_2100_seed_core_game_mission_admin
Create Date: 2026-01-31 15:00:00.000000

Note: SET_NULL on DELETE to preserve logs for audit purposes.
      Auth event table keeps NO FK for performance (high volume writes).
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260131_1500_add_v2_user_fk_to_log_tables'
down_revision = '20260130_2100_seed_core_game_mission_admin'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === v2_dice_log: user_id FK (SET NULL on DELETE) ===
    op.create_foreign_key(
        'fk_v2_dice_log_user_id',
        'v2_dice_log', 'v2_user',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    # user_id를 nullable로 변경 (SET NULL 지원)
    op.alter_column('v2_dice_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=True
    )

    # === v2_roulette_log: user_id FK (SET NULL on DELETE) ===
    op.create_foreign_key(
        'fk_v2_roulette_log_user_id',
        'v2_roulette_log', 'v2_user',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.alter_column('v2_roulette_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=True
    )

    # === v2_lottery_log: user_id FK (SET NULL on DELETE) ===
    op.create_foreign_key(
        'fk_v2_lottery_log_user_id',
        'v2_lottery_log', 'v2_user',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.alter_column('v2_lottery_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=True
    )

    # === v2_shop_order: user_id FK (SET NULL on DELETE) ===
    op.create_foreign_key(
        'fk_v2_shop_order_user_id',
        'v2_shop_order', 'v2_user',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.alter_column('v2_shop_order', 'user_id',
        existing_type=sa.Integer(),
        nullable=True
    )

    # Note: v2_user_auth_event는 FK 미설정 유지 (성능/유연성 고려)
    # - 인증 로그는 초당 수백건 발생 가능
    # - user_id=0인 실패 로그도 존재
    # - 90일 자동 삭제 정책으로 데이터 정합성 관리


def downgrade() -> None:
    # === v2_shop_order ===
    op.alter_column('v2_shop_order', 'user_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    op.drop_constraint('fk_v2_shop_order_user_id', 'v2_shop_order', type_='foreignkey')

    # === v2_lottery_log ===
    op.alter_column('v2_lottery_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    op.drop_constraint('fk_v2_lottery_log_user_id', 'v2_lottery_log', type_='foreignkey')

    # === v2_roulette_log ===
    op.alter_column('v2_roulette_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    op.drop_constraint('fk_v2_roulette_log_user_id', 'v2_roulette_log', type_='foreignkey')

    # === v2_dice_log ===
    op.alter_column('v2_dice_log', 'user_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    op.drop_constraint('fk_v2_dice_log_user_id', 'v2_dice_log', type_='foreignkey')
