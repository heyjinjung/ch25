"""v2_user_segment 테이블에 previous_segment 컬럼 추가 (Grace Period 판정용).

Revision ID: 20260216_1400
Revises: 20260215_0900
Create Date: 2026-02-16 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260216_1400"
down_revision = "20260215_0900"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "v2_user_segment",
        sa.Column(
            "previous_segment",
            sa.String(50),
            nullable=True,
            comment="직전 세그먼트 (전환 유예 기간 판정용)",
        ),
    )


def downgrade() -> None:
    op.drop_column("v2_user_segment", "previous_segment")
