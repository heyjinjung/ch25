"""Seed core game, mission, and admin data for production.

Revision ID: 20260130_2100_seed_core
Revises: 20260130_2000_add_missing_v2_game_columns
Create Date: 2026-01-30

Phase 1 - HIGH Priority Seed Data:
- v2_dice_config: 1 row
- v2_lottery_config: 1 row  
- v2_lottery_prize: 7 rows
- mission: 9 rows
- admin_user_profile: 3 rows
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


revision = "20260130_2100_seed_core"
down_revision = "20260130_2000_add_missing_v2_game_columns"
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
    # 1. v2_dice_config (1 row)
    # ─────────────────────────────────────────────────────────────────
    if not _row_exists("v2_dice_config", "ticket_type = 'DICE_TICKET'"):
        conn.execute(sa.text("""
            INSERT INTO v2_dice_config (
                name, ticket_type, is_active, max_daily_plays,
                win_reward_type, win_reward_amount,
                draw_reward_type, draw_reward_amount,
                lose_reward_type, lose_reward_amount,
                enable_golden_hour, golden_hour_multiplier,
                win_probability, draw_probability, lose_probability,
                daily_gain_cap, created_at, updated_at
            ) VALUES (
                'Default Dice Config', 'DICE_TICKET', 1, 100,
                'POINT', 500,
                'POINT', 100,
                'POINT', -200,
                0, 2,
                0.4, 0.2, 0.4,
                20000, :now, :now
            )
        """), {"now": now})
        print("[SEED] v2_dice_config: 1 row inserted")

    # ─────────────────────────────────────────────────────────────────
    # 2. v2_lottery_config (1 row)
    # ─────────────────────────────────────────────────────────────────
    if not _row_exists("v2_lottery_config", "ticket_type = 'LOTTERY_TICKET'"):
        conn.execute(sa.text("""
            INSERT INTO v2_lottery_config (
                name, ticket_type, is_active, max_daily_tickets,
                puzzle_piece_probability, created_at, updated_at
            ) VALUES (
                'Default Lottery Config', 'LOTTERY_TICKET', 1, 0,
                5, :now, :now
            )
        """), {"now": now})
        print("[SEED] v2_lottery_config: 1 row inserted")

    # ─────────────────────────────────────────────────────────────────
    # 3. v2_lottery_prize (7 rows)
    # ─────────────────────────────────────────────────────────────────
    # Get lottery config ID
    lottery_config_id = conn.execute(
        sa.text("SELECT id FROM v2_lottery_config WHERE ticket_type = 'LOTTERY_TICKET' LIMIT 1")
    ).scalar()

    if lottery_config_id:
        prizes = [
            # (label, reward_type, reward_amount, weight, stock, is_active)
            ("5000P", "POINT", 5000, 20, None, 1),
            ("꽝", "NONE", 0, 50, 500, 1),
            ("룰렛티켓", "ROULETTE_TICKET", 1, 30, 1000, 1),
            ("퍼즐C1", "PUZZLE_C1", 1, 84, None, 1),
            ("치킨1만", "CHICKEN_GIFTICON_10000", 1, 101, None, 1),
            ("골드키", "GOLD_KEY_TICKET", 1, 100, None, 1),
            ("퍼즐C2", "PUZZLE_C2", 0, 40, None, 1),
        ]
        
        for label, reward_type, reward_amount, weight, stock, is_active in prizes:
            if not _row_exists("v2_lottery_prize", f"config_id = {lottery_config_id} AND label = '{label}'"):
                stock_val = "NULL" if stock is None else str(stock)
                conn.execute(sa.text(f"""
                    INSERT INTO v2_lottery_prize (
                        config_id, label, reward_type, reward_amount, weight, stock, is_active, created_at, updated_at
                    ) VALUES (
                        {lottery_config_id}, '{label}', '{reward_type}', {reward_amount}, {weight}, {stock_val}, {is_active}, :now, :now
                    )
                """), {"now": now})
        print("[SEED] v2_lottery_prize: prizes inserted")

    # ─────────────────────────────────────────────────────────────────
    # 4. mission (9 rows)
    # ─────────────────────────────────────────────────────────────────
    missions = [
        # (title, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, auto_claim, is_active)
        ("신규 첫로그인", "NEW_USER", "NEW_USER_FIRST_LOGIN", "LOGIN", 1, "POINT", 3000, 0, 0, 1),
        ("신규 텔레그램 채널가입", "NEW_USER", "NEW_USER_TELEGRAM_JOIN", "JOIN_TELEGRAM_CHANNEL", 1, "PIZZA_GIFTICON_10000", 1, 0, 0, 1),
        ("신규 첫게임", "NEW_USER", "NEW_USER_FIRST_GAME", "PLAY_GAME", 1, "POINT", 2000, 0, 0, 1),
        ("주간 연속출석", "WEEKLY", "WEEKLY_LOGIN_STREAK_TEST", "LOGIN", 3, "POINT", 100, 0, 0, 1),
        ("오늘 10회 게임", "DAILY", "DAILY_PLAY_GENERIC", "PLAY_GAME", 10, "CC_POINT", 2000, 0, 0, 1),
        ("신규 CC채널가입", "NEW_USER", "NEW_USER_CC_CHANNEL_JOIN", "JOIN_CC_CHANNEL", 1, "POINT", 2000, 0, 0, 1),
        ("오늘 로그인", "DAILY", "DAILY_LOGIN_GIFT", "LOGIN", 1, "POINT", 1000, 0, 0, 1),
        ("신규 다음날 로그인 1일", "NEW_USER", "NEW_USER_NEW_USER_NEXT_DAY_LOGIN_1", "CONSECUTIVE_LOGIN", 1, "POINT", 1000, 0, 0, 1),
        ("주간 CC 입금 3회", "WEEKLY", "WEEKLY_WEEKLY_CC_DEPOSIT_3", "CC_DEPOSIT", 3, "POINT", 5000, 0, 0, 1),
    ]

    for title, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, auto_claim, is_active in missions:
        if not _row_exists("mission", f"logic_key = '{logic_key}'"):
            conn.execute(sa.text("""
                INSERT INTO mission (
                    title, category, logic_key, action_type, target_value,
                    reward_type, reward_amount, xp_reward, auto_claim, is_active, created_at
                ) VALUES (
                    :title, :category, :logic_key, :action_type, :target_value,
                    :reward_type, :reward_amount, :xp_reward, :auto_claim, :is_active, :now
                )
            """), {
                "title": title, "category": category, "logic_key": logic_key,
                "action_type": action_type, "target_value": target_value,
                "reward_type": reward_type, "reward_amount": reward_amount,
                "xp_reward": xp_reward, "auto_claim": auto_claim, "is_active": is_active,
                "now": now
            })
    print("[SEED] mission: missions inserted")

    # ─────────────────────────────────────────────────────────────────
    # 5. admin_user_profile (3 rows)
    # ─────────────────────────────────────────────────────────────────
    admin_profiles = [
        # (user_id, external_id, tags)
        (2, "admin", '["ROLE_ADMIN"]'),
        (8, "edge_withdraw_20260124", '["ROLE_ADMIN"]'),
        (999003, "admin", '["ROLE_ADMIN"]'),
    ]

    for user_id, external_id, tags in admin_profiles:
        if not _row_exists("admin_user_profile", f"user_id = {user_id}"):
            conn.execute(sa.text("""
                INSERT INTO admin_user_profile (user_id, external_id, tags, created_at, updated_at)
                VALUES (:user_id, :external_id, :tags, :now, :now)
            """), {"user_id": user_id, "external_id": external_id, "tags": tags, "now": now})
    print("[SEED] admin_user_profile: profiles inserted")

    print("[SEED] Phase 1 Complete: v2_dice_config, v2_lottery_config, v2_lottery_prize, mission, admin_user_profile")


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove seeded data (in reverse order)
    conn.execute(sa.text("DELETE FROM admin_user_profile WHERE user_id IN (2, 8, 999003)"))
    conn.execute(sa.text("DELETE FROM mission WHERE logic_key LIKE 'NEW_USER_%' OR logic_key LIKE 'DAILY_%' OR logic_key LIKE 'WEEKLY_%'"))
    conn.execute(sa.text("DELETE FROM v2_lottery_prize WHERE config_id IN (SELECT id FROM v2_lottery_config WHERE ticket_type = 'LOTTERY_TICKET')"))
    conn.execute(sa.text("DELETE FROM v2_lottery_config WHERE ticket_type = 'LOTTERY_TICKET'"))
    conn.execute(sa.text("DELETE FROM v2_dice_config WHERE ticket_type = 'DICE_TICKET'"))
    
    print("[SEED ROLLBACK] Phase 1 data removed")
