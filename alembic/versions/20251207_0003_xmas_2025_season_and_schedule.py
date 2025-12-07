"""XMAS 2025 Season (2025-12-09 ~ 2025-12-25) and feature_schedule seed

Revision ID: 20251207_0003
Revises: 20251207_0002
Create Date: 2025-12-07

Changes:
- Updates season_pass_config to use 2025-12-09 ~ 2025-12-25 dates
- Seeds feature_schedule for the entire event period
- Feature rotation: SEASON_PASS -> ROULETTE -> DICE -> LOTTERY -> RANKING (5-day cycle)
"""
from alembic import op

revision = "20251207_0003"
down_revision = "20251207_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Update season_pass_config to XMAS 2025 season (2025-12-09 ~ 2025-12-25)
    op.execute(
        """
        UPDATE season_pass_config 
        SET season_name = 'XMAS_2025',
            start_date = '2025-12-09',
            end_date = '2025-12-25',
            updated_at = NOW()
        WHERE id = 1;
        """
    )

    # 2) Clear existing feature_schedule for the date range (idempotent)
    op.execute(
        """
        DELETE FROM feature_schedule 
        WHERE date >= '2025-12-09' AND date <= '2025-12-25';
        """
    )

    # 3) Insert feature_schedule for 2025-12-09 ~ 2025-12-25
    # Feature rotation (5-day cycle):
    #   Day 1: SEASON_PASS (intro day)
    #   Day 2: ROULETTE
    #   Day 3: DICE
    #   Day 4: LOTTERY
    #   Day 5: RANKING
    # After that, cycle repeats: ROULETTE -> DICE -> LOTTERY -> RANKING
    # 
    # Schedule:
    #   2025-12-09: SEASON_PASS (Day 1 - Season kick-off)
    #   2025-12-10: ROULETTE
    #   2025-12-11: DICE
    #   2025-12-12: LOTTERY
    #   2025-12-13: RANKING
    #   2025-12-14: ROULETTE
    #   2025-12-15: DICE
    #   2025-12-16: LOTTERY
    #   2025-12-17: RANKING
    #   2025-12-18: ROULETTE
    #   2025-12-19: DICE
    #   2025-12-20: LOTTERY
    #   2025-12-21: RANKING
    #   2025-12-22: ROULETTE
    #   2025-12-23: DICE
    #   2025-12-24: LOTTERY (Christmas Eve)
    #   2025-12-25: SEASON_PASS (Christmas - Season finale, is_active=1 for final rewards)

    op.execute(
        """
        INSERT INTO feature_schedule (date, feature_type, is_active, created_at, updated_at) VALUES
        ('2025-12-09', 'SEASON_PASS', 1, NOW(), NOW()),
        ('2025-12-10', 'ROULETTE', 1, NOW(), NOW()),
        ('2025-12-11', 'DICE', 1, NOW(), NOW()),
        ('2025-12-12', 'LOTTERY', 1, NOW(), NOW()),
        ('2025-12-13', 'RANKING', 1, NOW(), NOW()),
        ('2025-12-14', 'ROULETTE', 1, NOW(), NOW()),
        ('2025-12-15', 'DICE', 1, NOW(), NOW()),
        ('2025-12-16', 'LOTTERY', 1, NOW(), NOW()),
        ('2025-12-17', 'RANKING', 1, NOW(), NOW()),
        ('2025-12-18', 'ROULETTE', 1, NOW(), NOW()),
        ('2025-12-19', 'DICE', 1, NOW(), NOW()),
        ('2025-12-20', 'LOTTERY', 1, NOW(), NOW()),
        ('2025-12-21', 'RANKING', 1, NOW(), NOW()),
        ('2025-12-22', 'ROULETTE', 1, NOW(), NOW()),
        ('2025-12-23', 'DICE', 1, NOW(), NOW()),
        ('2025-12-24', 'LOTTERY', 1, NOW(), NOW()),
        ('2025-12-25', 'SEASON_PASS', 1, NOW(), NOW());
        """
    )

    # 4) Add feature_config entries for all feature types if not exist
    # This ensures all feature types have a config entry
    op.execute(
        """
        INSERT INTO feature_config (feature_type, title, page_path, is_enabled, config_json, created_at, updated_at)
        VALUES 
          ('SEASON_PASS', 'Season Pass', '/season-pass', 1, NULL, NOW(), NOW()),
          ('DICE', 'Christmas Dice', '/dice', 1, NULL, NOW(), NOW()),
          ('LOTTERY', 'Christmas Lottery', '/lottery', 1, NULL, NOW(), NOW()),
          ('RANKING', 'Christmas Ranking', '/ranking', 1, NULL, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          title=VALUES(title), 
          page_path=VALUES(page_path), 
          is_enabled=VALUES(is_enabled), 
          updated_at=NOW();
        """
    )


def downgrade() -> None:
    # Remove the feature_schedule entries for the date range
    op.execute(
        """
        DELETE FROM feature_schedule 
        WHERE date >= '2025-12-09' AND date <= '2025-12-25';
        """
    )

    # Restore original season_pass_config dates (Christmas Season Pass demo)
    op.execute(
        """
        UPDATE season_pass_config 
        SET season_name = 'Christmas Season Pass',
            start_date = '2025-12-01',
            end_date = '2025-12-31',
            updated_at = NOW()
        WHERE id = 1;
        """
    )

    # Re-insert the original CURDATE() schedule if needed
    op.execute(
        """
        INSERT INTO feature_schedule (date, feature_type, is_active, created_at, updated_at)
        VALUES (CURDATE(), 'ROULETTE', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE feature_type=VALUES(feature_type), is_active=VALUES(is_active), updated_at=NOW();
        """
    )
