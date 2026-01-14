"""Seed default event_config rows for segment campaigns and Golden Hour.

Revision ID: 20260115_0910_seed_event_config_defaults
Revises: 20260115_0900_add_event_config
Create Date: 2026-01-15 09:10:00.000000
"""

from alembic import op

revision = "20260115_0910_seed_event_config_defaults"
down_revision = "20260115_0900_add_event_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Golden Hour (seeded but inactive; actual control uses Vault2 config).
    op.execute(
        """
        INSERT INTO event_config (
            event_type, is_active, multiplier, start_time, end_time, target_segment, config_json, created_at, updated_at
        )
        SELECT
            'GOLDEN_HOUR', 0, 2.0, '20:00:00', '21:00:00', NULL,
            '{"label":"Golden Hour"}', NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM event_config WHERE event_type = 'GOLDEN_HOUR' AND target_segment IS NULL
        );
        """
    )

    # Segment campaign policies.
    op.execute(
        """
        INSERT INTO event_config (
            event_type, is_active, multiplier, start_time, end_time, target_segment, config_json, created_at, updated_at
        )
        SELECT
            'SEGMENT_CAMPAIGN', 1, NULL, NULL, NULL, 'COMMON',
            '{"vault_balance_threshold":5000,"vault_zero_threshold":0,"require_no_deposit":true,"event_codes":{"vault_threshold":"SEGMENT_COMMON_VAULT_5000","vault_zero":"SEGMENT_COMMON_VAULT_ZERO"}}',
            NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM event_config WHERE event_type = 'SEGMENT_CAMPAIGN' AND target_segment = 'COMMON'
        );
        """
    )

    op.execute(
        """
        INSERT INTO event_config (
            event_type, is_active, multiplier, start_time, end_time, target_segment, config_json, created_at, updated_at
        )
        SELECT
            'SEGMENT_CAMPAIGN', 1, NULL, NULL, NULL, 'VIP',
            '{"golden_hour_event_type":"SEGMENT_VIP_GOLDEN_HOUR","monthly_charge_threshold":3000000,"monthly_event_type":"SEGMENT_VIP_MONTHLY"}',
            NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM event_config WHERE event_type = 'SEGMENT_CAMPAIGN' AND target_segment = 'VIP'
        );
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM event_config WHERE event_type = 'GOLDEN_HOUR' AND target_segment IS NULL;")
    op.execute("DELETE FROM event_config WHERE event_type = 'SEGMENT_CAMPAIGN' AND target_segment = 'COMMON';")
    op.execute("DELETE FROM event_config WHERE event_type = 'SEGMENT_CAMPAIGN' AND target_segment = 'VIP';")
