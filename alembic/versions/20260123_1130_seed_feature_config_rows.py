"""Seed minimal feature_config rows for game status endpoints.

V2에서 today-feature 스케줄 게이트는 아카이브(기본 OFF) 상태여도,
각 게임 status 엔드포인트는 FeatureService.validate_feature_active()에서
feature_config(기능 스위치) row를 필요로 한다.

로컬/신규 DB에서 feature_config가 비어 있으면
/api/v2/(dice|roulette|lottery)/status 가 404(NO_FEATURE_TODAY)로 막히므로,
최소 row 3개를 idempotent upsert로 보장한다.

Revision ID: 20260123_1130_seed_feature_config_rows
Revises: 20260120_1924_v2_game_token_standardization
Create Date: 2026-01-23
"""

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = "20260123_1130_seed_feature_config_rows"
down_revision = "20260120_1924_v2_game_token_standardization"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    rows = [
        ("ROULETTE", "Roulette", "/v2/game/roulette", True),
        ("DICE", "Dice", "/v2/game/dice", True),
        ("LOTTERY", "Lottery", "/v2/game/lottery", True),
    ]

    if dialect in {"mysql", "mariadb"}:
        for feature_type, title, page_path, is_enabled in rows:
            conn.execute(
                text(
                    """
                    INSERT INTO feature_config
                        (feature_type, title, page_path, is_enabled, config_json, created_at, updated_at)
                    VALUES
                        (:feature_type, :title, :page_path, :is_enabled, NULL, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        page_path = VALUES(page_path),
                        is_enabled = VALUES(is_enabled),
                        updated_at = NOW();
                    """
                ),
                {
                    "feature_type": feature_type,
                    "title": title,
                    "page_path": page_path,
                    "is_enabled": 1 if is_enabled else 0,
                },
            )
        return

    # Generic fallback (best-effort): try insert; ignore duplicates.
    for feature_type, title, page_path, is_enabled in rows:
        try:
            conn.execute(
                text(
                    """
                    INSERT INTO feature_config
                        (feature_type, title, page_path, is_enabled, config_json, created_at, updated_at)
                    VALUES
                        (:feature_type, :title, :page_path, :is_enabled, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                ),
                {
                    "feature_type": feature_type,
                    "title": title,
                    "page_path": page_path,
                    "is_enabled": 1 if is_enabled else 0,
                },
            )
        except Exception:
            # Ignore for non-mysql engines when unique constraint triggers.
            pass


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DELETE FROM feature_config
            WHERE feature_type IN ('ROULETTE', 'DICE', 'LOTTERY');
            """
        )
    )
