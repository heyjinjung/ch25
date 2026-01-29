"""Add V2 auth tables (auth_event, refresh_token).

Revision ID: 20260128_1800_add_v2_auth_tables
Revises: 20260127_1600_add_missing_mission_gifticons
Create Date: 2026-01-28 18:00:00.000000

V2 Auth 시스템을 위한 테이블 생성:
1. v2_user_auth_event: 인증 이벤트 로그 (90일 보존)
2. v2_user_refresh_token: Refresh Token 저장 (30일 sliding window)
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260128_1800_add_v2_auth_tables"
down_revision = "20260127_1600_add_missing_mission_gifticons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # ========================================================================
    # 1. v2_user_auth_event 테이블
    # ========================================================================

    # PostgreSQL: ENUM 타입 먼저 생성
    if dialect == "postgresql":
        op.execute("""
            DO $$ BEGIN
                CREATE TYPE autheventtype AS ENUM (
                    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
                    'TOKEN_REFRESH', 'TELEGRAM_LINK', 'TELEGRAM_UNLINK', 'RBAC_DENIED'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
        """)

    op.create_table(
        "v2_user_auth_event",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False, comment="유저 ID (실패 시 0)"),
        sa.Column(
            "event_type",
            sa.Enum(
                "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT",
                "TOKEN_REFRESH", "TELEGRAM_LINK", "TELEGRAM_UNLINK", "RBAC_DENIED",
                name="autheventtype",
            ),
            nullable=False,
            comment="이벤트 타입",
        ),
        sa.Column("ip_address", sa.String(45), nullable=True, comment="클라이언트 IP (IPv6 지원)"),
        sa.Column("user_agent", sa.String(500), nullable=True, comment="User-Agent 헤더"),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True, comment="텔레그램 유저 ID"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="1", comment="성공 여부"),
        sa.Column("error_message", sa.String(500), nullable=True, comment="실패 시 에러 메시지"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            comment="생성 시각",
        ),
        sa.PrimaryKeyConstraint("id"),
        comment="V2 유저 인증 이벤트 로그 (90일 보존)",
    )

    op.create_index("idx_v2_user_auth_event_user_id", "v2_user_auth_event", ["user_id"])
    op.create_index("idx_v2_user_auth_event_created_at", "v2_user_auth_event", ["created_at"])
    op.create_index(
        "idx_v2_user_auth_event_user_created",
        "v2_user_auth_event",
        ["user_id", "created_at"],
    )

    # ========================================================================
    # 2. v2_user_refresh_token 테이블
    # ========================================================================
    op.create_table(
        "v2_user_refresh_token",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False, comment="유저 ID"),
        sa.Column("jti", sa.String(64), nullable=False, comment="JWT Token ID (UUID)"),
        sa.Column("expires_at", sa.DateTime(), nullable=False, comment="만료 시각"),
        sa.Column("revoked_at", sa.DateTime(), nullable=True, comment="폐기 시각 (NULL이면 유효)"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            comment="생성 시각",
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            comment="마지막 사용 시각",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("jti", name="uq_v2_refresh_token_jti"),
        comment="V2 유저 Refresh Token (30일 sliding window)",
    )

    op.create_index("idx_v2_refresh_token_user_id", "v2_user_refresh_token", ["user_id"])
    op.create_index("idx_v2_refresh_token_jti", "v2_user_refresh_token", ["jti"])
    op.create_index("idx_v2_refresh_token_expires_at", "v2_user_refresh_token", ["expires_at"])
    op.create_index(
        "idx_v2_refresh_token_user_expires",
        "v2_user_refresh_token",
        ["user_id", "expires_at"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # Drop indexes first
    op.drop_index("idx_v2_refresh_token_user_expires", table_name="v2_user_refresh_token")
    op.drop_index("idx_v2_refresh_token_expires_at", table_name="v2_user_refresh_token")
    op.drop_index("idx_v2_refresh_token_jti", table_name="v2_user_refresh_token")
    op.drop_index("idx_v2_refresh_token_user_id", table_name="v2_user_refresh_token")

    op.drop_index("idx_v2_user_auth_event_user_created", table_name="v2_user_auth_event")
    op.drop_index("idx_v2_user_auth_event_created_at", table_name="v2_user_auth_event")
    op.drop_index("idx_v2_user_auth_event_user_id", table_name="v2_user_auth_event")

    # Drop tables
    op.drop_table("v2_user_refresh_token")
    op.drop_table("v2_user_auth_event")

    # PostgreSQL: Drop ENUM type
    if dialect == "postgresql":
        op.execute("DROP TYPE IF EXISTS autheventtype")
