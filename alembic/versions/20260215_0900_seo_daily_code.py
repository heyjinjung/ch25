"""SEO 일일 검색 미션 코드 테이블 생성.

Revision ID: 20260215_0900
Revises: 20260214_1000
Create Date: 2026-02-15 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260215_0900"
down_revision = "20260214_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) seo_daily_code 테이블
    op.create_table(
        "seo_daily_code",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("target_date", sa.Date(), nullable=False, index=True),
        sa.Column("reward_min", sa.Integer(), nullable=False, server_default="3000"),
        sa.Column("reward_max", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # 2) user_seo_daily_code_claim 테이블
    op.create_table(
        "user_seo_daily_code_claim",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("v2_user.id"), nullable=False, index=True),
        sa.Column("seo_code_id", sa.Integer(), sa.ForeignKey("seo_daily_code.id"), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("user_id", "seo_code_id", name="uq_user_seo_code"),
    )
    
    # Index for claim date check (user_id + claimed_at)
    op.create_index(
        "ix_user_seo_claim_date",
        "user_seo_daily_code_claim",
        ["user_id", "claimed_at"]
    )

    # 3) 초기 시드 데이터 (첫날 코드 - 실제 운영 시 Cron이 생성)
    op.execute("""
        INSERT INTO seo_daily_code (code, target_date, reward_min, reward_max, is_active, created_at)
        VALUES ('SEOFIRST', CURDATE(), 3000, 5000, 1, NOW())
    """)


def downgrade() -> None:
    op.drop_table("user_seo_daily_code_claim")
    op.drop_table("seo_daily_code")
