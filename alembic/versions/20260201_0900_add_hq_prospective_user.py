"""Add hq_prospective_user table

Revision ID: 20260201_0900_add_hq_prospective_user
Revises: 20260131_1600_add_dice_golden_hour_time_columns
Create Date: 2026-02-01 09:00:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '20260201_0900_add_hq_prospective_user'
down_revision: Union[str, None] = '20260131_1600_add_dice_golden_hour_time_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table_name: str) -> bool:
    result = conn.execute(text(
        f"SELECT COUNT(*) FROM information_schema.tables "
        f"WHERE table_schema = DATABASE() AND table_name = '{table_name}'"
    ))
    return result.scalar() > 0


def _index_exists(conn, table_name: str, index_name: str) -> bool:
    result = conn.execute(text(
        f"SELECT COUNT(*) FROM information_schema.statistics "
        f"WHERE table_schema = DATABASE() AND table_name = '{table_name}' AND index_name = '{index_name}'"
    ))
    return result.scalar() > 0


def upgrade() -> None:
    conn = op.get_bind()
    
    if not _table_exists(conn, 'hq_prospective_user'):
        op.create_table(
            'hq_prospective_user',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('nickname', sa.String(100), nullable=False, index=True),
            sa.Column('cc_id', sa.String(100), nullable=False),
            sa.Column('total_margin', sa.BigInteger(), default=0, nullable=True),
            sa.Column('total_charge', sa.BigInteger(), default=0, nullable=True),
            sa.Column('inactive_days', sa.Integer(), default=0, nullable=True),
            sa.Column('segment', sa.String(50), nullable=False),
            sa.Column('is_joined', sa.Boolean(), default=False, index=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('nickname', 'cc_id', name='_nickname_ccid_uc'),
        )
    
    # 인덱스는 create_table의 index=True로 이미 생성되므로 별도 생성 불필요


def downgrade() -> None:
    conn = op.get_bind()
    
    if _table_exists(conn, 'hq_prospective_user'):
        op.drop_table('hq_prospective_user')
