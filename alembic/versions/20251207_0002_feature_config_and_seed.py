"""Add feature_config columns and seed demo data

Revision ID: 20251207_0002
Revises: 20241206_0001
Create Date: 2025-12-07
"""
from alembic import op

revision = "20251207_0002"
down_revision = "20241206_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Schema changes for feature_config
    op.execute(
        """
        ALTER TABLE feature_config
          CHANGE COLUMN config config_json JSON NULL,
          ADD COLUMN title VARCHAR(100) NOT NULL DEFAULT 'Event',
          ADD COLUMN page_path VARCHAR(100) NOT NULL DEFAULT '/';
        """
    )

    # Seed minimal demo data (idempotent via ON DUPLICATE KEY UPDATE)
    # Each statement must be executed separately in MySQL
    op.execute(
        """
        INSERT INTO user (id, external_id, status, level, created_at, updated_at)
        VALUES (1, 'demo-user', 'ACTIVE', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE external_id=VALUES(external_id), status=VALUES(status), updated_at=NOW();
        """
    )

    op.execute(
        """
        INSERT INTO feature_config (feature_type, title, page_path, is_enabled, config_json, created_at, updated_at)
        VALUES ('ROULETTE', 'Christmas Roulette', '/roulette', 1, NULL, NOW(), NOW())
        ON DUPLICATE KEY UPDATE title=VALUES(title), page_path=VALUES(page_path), is_enabled=VALUES(is_enabled), updated_at=NOW();
        """
    )

    op.execute(
        """
        INSERT INTO feature_schedule (date, feature_type, is_active, created_at, updated_at)
        VALUES (CURDATE(), 'ROULETTE', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE feature_type=VALUES(feature_type), is_active=VALUES(is_active), updated_at=NOW();
        """
    )

    op.execute(
        """
        INSERT INTO season_pass_config (id, season_name, start_date, end_date, max_level, base_xp_per_stamp, is_active, created_at, updated_at)
        VALUES (1, 'Christmas Season Pass', '2025-12-01', '2025-12-31', 5, 10, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE season_name=VALUES(season_name), start_date=VALUES(start_date), end_date=VALUES(end_date),
            max_level=VALUES(max_level), base_xp_per_stamp=VALUES(base_xp_per_stamp), is_active=VALUES(is_active), updated_at=NOW();
        """
    )

    op.execute(
        """
        INSERT INTO season_pass_level (id, season_id, level, required_xp, reward_type, reward_amount, auto_claim, created_at, updated_at)
        VALUES
          (1, 1, 1, 0, 'COIN', 100, 1, NOW(), NOW()),
          (2, 1, 2, 20, 'COIN', 200, 1, NOW(), NOW()),
          (3, 1, 3, 50, 'COIN', 300, 0, NOW(), NOW()),
          (4, 1, 4, 80, 'COIN', 500, 0, NOW(), NOW()),
          (5, 1, 5, 120, 'COIN', 800, 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE required_xp=VALUES(required_xp), reward_type=VALUES(reward_type),
            reward_amount=VALUES(reward_amount), auto_claim=VALUES(auto_claim), updated_at=NOW();
        """
    )


def downgrade() -> None:
    # Remove seeded rows (safe deletes by keys)
    op.execute("DELETE FROM season_pass_level WHERE season_id = 1;")
    op.execute("DELETE FROM season_pass_config WHERE id = 1;")
    op.execute("DELETE FROM feature_schedule WHERE date = CURDATE();")
    op.execute("DELETE FROM feature_config WHERE feature_type = 'ROULETTE';")
    op.execute("DELETE FROM user WHERE id = 1;")

    # Revert schema changes
    op.execute(
        """
        ALTER TABLE feature_config
          DROP COLUMN page_path,
          DROP COLUMN title,
          CHANGE COLUMN config_json config JSON NULL;
        """
    )
