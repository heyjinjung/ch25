"""Seed roulette configs, segments, and segment rules for production.

Revision ID: 20260130_2200_seed_roulette
Revises: 20260130_2100_seed_core
Create Date: 2026-01-30

Phase 2 - MEDIUM Priority Seed Data:
- v2_roulette_config: 4 additional rows (DIAMOND_TICKET, GOLD_KEY_TICKET, TRIAL_TICKET)
- v2_roulette_segment: 32 additional rows (8 segments per config)
- v2_segment_rule: 5 rows
- segment_rule: 11 rows (V1 compatibility)
- feature_config: 2 additional rows (RANKING, SEASON_PASS)
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


revision = "20260130_2200_seed_roulette"
down_revision = "20260130_2100_seed_core"
branch_labels = None
depends_on = None


def _row_exists(table: str, condition: str) -> bool:
    """Check if a row exists."""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table} WHERE {condition}")).scalar()
    return result > 0


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # ─────────────────────────────────────────────────────────────────
    # 1. v2_roulette_config - Add missing ticket types
    # ─────────────────────────────────────────────────────────────────
    # Production already has 4 ROULETTE_TICKET configs, need to add other types
    
    roulette_configs = [
        # (name, ticket_type, is_active, max_daily_spins, grade)
        ("다이아 룰렛", "DIAMOND_TICKET", 1, 5, "COMMON"),
        ("골드키 룰렛", "GOLD_KEY_TICKET", 1, 3, "COMMON"),
        ("체험 룰렛", "TRIAL_TICKET", 1, 3, "COMMON"),
        ("기본 룰렛", "ROULETTE_TICKET", 1, 10, "COMMON"),
    ]

    created_config_ids = {}
    
    for name, ticket_type, is_active, max_daily_spins, grade in roulette_configs:
        # Check if active config for this ticket_type exists
        existing = conn.execute(sa.text(
            f"SELECT id FROM v2_roulette_config WHERE ticket_type = '{ticket_type}' AND is_active = 1 LIMIT 1"
        )).scalar()
        
        if not existing:
            conn.execute(sa.text("""
                INSERT INTO v2_roulette_config (name, ticket_type, is_active, max_daily_spins, grade, created_at, updated_at)
                VALUES (:name, :ticket_type, :is_active, :max_daily_spins, :grade, :now, :now)
            """), {
                "name": name, "ticket_type": ticket_type, "is_active": is_active,
                "max_daily_spins": max_daily_spins, "grade": grade, "now": now
            })
            # Get the inserted ID
            config_id = conn.execute(sa.text(
                f"SELECT id FROM v2_roulette_config WHERE ticket_type = '{ticket_type}' AND is_active = 1 ORDER BY id DESC LIMIT 1"
            )).scalar()
            created_config_ids[ticket_type] = config_id
            print(f"[SEED] v2_roulette_config: {ticket_type} inserted (id={config_id})")
        else:
            created_config_ids[ticket_type] = existing

    # ─────────────────────────────────────────────────────────────────
    # 2. v2_roulette_segment - Add segments for each config
    # ─────────────────────────────────────────────────────────────────
    # Default 8 segments per roulette config
    default_segments = [
        # (slot_index, label, reward_type, reward_amount, weight)
        (0, "꽝", "NONE", 0, 30),
        (1, "50 포인트", "POINT", 50, 25),
        (2, "100 포인트", "POINT", 100, 20),
        (3, "200 포인트", "POINT", 200, 15),
        (4, "300 포인트", "POINT", 300, 10),
        (5, "주사위 티켓 x2", "DICE_TICKET", 2, 5),
        (6, "복권 티켓 x2", "LOTTERY_TICKET", 2, 4),
        (7, "대박 포인트!", "POINT", 1000, 1),
    ]

    for ticket_type, config_id in created_config_ids.items():
        if config_id:
            # Check if segments already exist for this config
            existing_segments = conn.execute(sa.text(
                f"SELECT COUNT(*) FROM v2_roulette_segment WHERE config_id = {config_id}"
            )).scalar()
            
            if existing_segments == 0:
                for slot_index, label, reward_type, reward_amount, weight in default_segments:
                    conn.execute(sa.text("""
                        INSERT INTO v2_roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, created_at, updated_at)
                        VALUES (:config_id, :slot_index, :label, :reward_type, :reward_amount, :weight, :now, :now)
                    """), {
                        "config_id": config_id, "slot_index": slot_index, "label": label,
                        "reward_type": reward_type, "reward_amount": reward_amount, "weight": weight, "now": now
                    })
                print(f"[SEED] v2_roulette_segment: 8 segments inserted for config_id={config_id}")

    # ─────────────────────────────────────────────────────────────────
    # 3. v2_segment_rule (5 rows) - V2 전용 세그먼트 규칙
    # ─────────────────────────────────────────────────────────────────
    v2_segment_rules = [
        ("분류: VIP (입금 100만+)", "VIP", 10, 1, '{"op": ">=", "field": "deposit_amount", "value": 1000000}'),
        ("분류: ACTIVE (비활성 0~1일)", "ACTIVE", 20, 1, '{"op": "<=", "field": "days_since_last_active", "value": 1}'),
        ("분류: AT_RISK (비활성 2~6일)", "AT_RISK", 30, 1, '{"all": [{"op": ">=", "field": "days_since_last_active", "value": 2}, {"op": "<=", "field": "days_since_last_active", "value": 6}]}'),
        ("분류: DORMANT (비활성 7일+)", "DORMANT", 40, 1, '{"op": ">=", "field": "days_since_last_active", "value": 7}'),
        ("분류: NEW (비활성 날짜 없음)", "NEW", 90, 1, '{"op": "is_null", "field": "days_since_last_active"}'),
    ]

    for name, segment, priority, enabled, condition_json in v2_segment_rules:
        if not _row_exists("v2_segment_rule", f"segment = '{segment}'"):
            conn.execute(sa.text("""
                INSERT INTO v2_segment_rule (name, segment, priority, enabled, condition_json, created_at, updated_at)
                VALUES (:name, :segment, :priority, :enabled, :condition_json, :now, :now)
            """), {
                "name": name, "segment": segment, "priority": priority,
                "enabled": enabled, "condition_json": condition_json, "now": now
            })
    print("[SEED] v2_segment_rule: 5 rows inserted")

    # ─────────────────────────────────────────────────────────────────
    # 4. segment_rule (11 rows) - V1 호환성을 위한 세그먼트 규칙
    # ─────────────────────────────────────────────────────────────────
    v1_segment_rules = [
        ("분류: VIP (입금 100만+ / 비활성 7일+)", "VIP", 10, 1, '{"all": [{"op": ">=", "field": "deposit_amount", "value": 1000000}, {"op": ">=", "field": "days_since_last_active", "value": 7}]}'),
        ("분류: VIP (입금 100만+ / 비활성 0~6일)", "VIP", 11, 1, '{"all": [{"op": ">=", "field": "deposit_amount", "value": 1000000}, {"op": "<=", "field": "days_since_last_active", "value": 6}]}'),
        ("분류: ACTIVE (비활성 0~1일 / 충전후 0~2일)", "ACTIVE", 20, 1, '{"all": [{"op": "<=", "field": "days_since_last_active", "value": 1}, {"op": "<=", "field": "days_since_last_charge", "value": 2}]}'),
        ("분류: ACTIVE (비활성 0~1일)", "ACTIVE", 21, 1, '{"op": "<=", "field": "days_since_last_active", "value": 1}'),
        ("분류: AT_RISK (비활성 2~6일 / 충전후 3일+ 또는 없음)", "AT_RISK", 30, 1, '{"all": [{"op": ">=", "field": "days_since_last_active", "value": 2}, {"op": "<=", "field": "days_since_last_active", "value": 6}, {"any": [{"op": ">=", "field": "days_since_last_charge", "value": 3}, {"op": "is_null", "field": "days_since_last_charge"}]}]}'),
        ("분류: AT_RISK (비활성 2~6일)", "AT_RISK", 31, 1, '{"all": [{"op": ">=", "field": "days_since_last_active", "value": 2}, {"op": "<=", "field": "days_since_last_active", "value": 6}]}'),
        ("분류: DORMANT (비활성 14일+)", "DORMANT", 40, 1, '{"op": ">=", "field": "days_since_last_active", "value": 14}'),
        ("분류: DORMANT (비활성 7~13일)", "DORMANT", 41, 1, '{"all": [{"op": ">=", "field": "days_since_last_active", "value": 7}, {"op": "<=", "field": "days_since_last_active", "value": 13}]}'),
        ("분류: NEW (입금 0 / 최근 활성 있음)", "NEW", 80, 1, '{"all": [{"op": "==", "field": "deposit_amount", "value": 0}, {"op": "<=", "field": "days_since_last_active", "value": 3}]}'),
        ("분류: NEW (비활성 없음/입금 0)", "NEW", 90, 1, '{"all": [{"op": "is_null", "field": "days_since_last_active"}, {"op": "==", "field": "deposit_amount", "value": 0}]}'),
        ("분류: DORMANT (비활성 없음/입금 있음)", "DORMANT", 91, 1, '{"all": [{"op": "is_null", "field": "days_since_last_active"}, {"op": ">", "field": "deposit_amount", "value": 0}]}'),
    ]

    for name, segment, priority, enabled, condition_json in v1_segment_rules:
        if not _row_exists("segment_rule", f"name = '{name}'"):
            conn.execute(sa.text("""
                INSERT INTO segment_rule (name, segment, priority, enabled, condition_json, created_at, updated_at)
                VALUES (:name, :segment, :priority, :enabled, :condition_json, :now, :now)
            """), {
                "name": name, "segment": segment, "priority": priority,
                "enabled": enabled, "condition_json": condition_json, "now": now
            })
    print("[SEED] segment_rule: 11 rows inserted")

    # ─────────────────────────────────────────────────────────────────
    # 5. feature_config (2 additional rows)
    # ─────────────────────────────────────────────────────────────────
    # Production already has ROULETTE, DICE, LOTTERY
    additional_features = [
        ("RANKING", "Ranking", "/ranking", 1),
        ("SEASON_PASS", "Season Pass", "/season-pass", 1),
    ]

    for feature_type, title, page_path, is_enabled in additional_features:
        if not _row_exists("feature_config", f"feature_type = '{feature_type}'"):
            conn.execute(sa.text("""
                INSERT INTO feature_config (feature_type, title, page_path, is_enabled, created_at, updated_at)
                VALUES (:feature_type, :title, :page_path, :is_enabled, :now, :now)
            """), {
                "feature_type": feature_type, "title": title,
                "page_path": page_path, "is_enabled": is_enabled, "now": now
            })
    print("[SEED] feature_config: 2 additional rows inserted")

    print("[SEED] Phase 2 Complete: v2_roulette_config, v2_roulette_segment, v2_segment_rule, segment_rule, feature_config")


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove seeded data (in reverse order)
    conn.execute(sa.text("DELETE FROM feature_config WHERE feature_type IN ('RANKING', 'SEASON_PASS')"))
    conn.execute(sa.text("DELETE FROM segment_rule"))
    conn.execute(sa.text("DELETE FROM v2_segment_rule"))
    conn.execute(sa.text("DELETE FROM v2_roulette_segment WHERE config_id IN (SELECT id FROM v2_roulette_config WHERE ticket_type IN ('DIAMOND_TICKET', 'GOLD_KEY_TICKET', 'TRIAL_TICKET'))"))
    conn.execute(sa.text("DELETE FROM v2_roulette_config WHERE ticket_type IN ('DIAMOND_TICKET', 'GOLD_KEY_TICKET', 'TRIAL_TICKET')"))
    
    print("[SEED ROLLBACK] Phase 2 data removed")
