"""
Test data seeding script for local development/testing (updated for current schema).

Usage:
    python scripts/seed_test_data.py

This script:
1. Upserts feature_config rows
2. Upserts feature_schedule for today
3. Seeds roulette_config/segments
4. Seeds lottery_config/prizes
5. Seeds dice_config
6. Upserts a test user (external_id = 'test-user-001')

Requires: DATABASE_URL environment variable
"""
import os
import sys
from datetime import date, datetime
from zoneinfo import ZoneInfo

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)


def seed_feature_config(db):
    """Seed feature_config table with current columns."""
    print("\n=== Seeding feature_config ===")

    features = [
        ("ROULETTE", "Christmas Roulette", "/roulette", True, None),
        ("DICE", "Dice Game", "/dice", True, None),
        ("LOTTERY", "Lottery", "/lottery", True, None),
        ("RANKING", "Ranking", "/ranking", True, None),
        ("SEASON_PASS", "Season Pass", "/season-pass", True, None),
    ]

    for feature_type, title, page_path, is_enabled, config_json in features:
        db.execute(
            text(
                """
                INSERT INTO feature_config (feature_type, title, page_path, is_enabled, config_json, created_at, updated_at)
                VALUES (:feature_type, :title, :page_path, :is_enabled, :config_json, NOW(), NOW())
                ON DUPLICATE KEY UPDATE title=:title, page_path=:page_path, is_enabled=:is_enabled, config_json=:config_json, updated_at=NOW();
                """
            ),
            {
                "feature_type": feature_type,
                "title": title,
                "page_path": page_path,
                "is_enabled": is_enabled,
                "config_json": config_json,
            },
        )
        print(f"  ✓ {feature_type}: enabled={is_enabled}")

    db.commit()


def seed_feature_schedule(db):
    """Seed feature_schedule with today's date (ROULETTE active)."""
    print("\n=== Seeding feature_schedule ===")

    today = datetime.now(ZoneInfo("Asia/Seoul")).date()

    db.execute(
        text(
            """
            INSERT INTO feature_schedule (`date`, feature_type, is_active, created_at, updated_at)
            VALUES (:today, 'ROULETTE', TRUE, NOW(), NOW())
            ON DUPLICATE KEY UPDATE feature_type='ROULETTE', is_active=TRUE, updated_at=NOW();
            """
        ),
        {"today": today},
    )

    print(f"  ✓ {today}: ROULETTE active")
    db.commit()


def seed_roulette(db):
    """Seed roulette_config and roulette_segment (6 slots)."""
    print("\n=== Seeding roulette ===")

    # Create or get config
    cfg = db.execute(text("SELECT id FROM roulette_config WHERE is_active=TRUE LIMIT 1"))
    cfg_id = cfg.scalar()
    if not cfg_id:
        db.execute(
            text(
                """INSERT INTO roulette_config (name, is_active, max_daily_spins, created_at, updated_at)
                VALUES ('Christmas Roulette', TRUE, 0, NOW(), NOW())"""
            )
        )
        cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created roulette_config id={cfg_id}")
    else:
        print(f"  ✓ Using roulette_config id={cfg_id}")

    segments = [
        (0, "100 코인", "POINT", 100, 30, False),
        (1, "200 코인", "POINT", 200, 25, False),
        (2, "500 코인", "POINT", 500, 15, False),
        (3, "꽝", "NONE", 0, 17, False),
        (4, "1,000 코인", "POINT", 1000, 8, True),
        (5, "10,000 잭팟", "POINT", 10000, 5, True),
    ]

    db.execute(text("DELETE FROM roulette_segment WHERE config_id = :cfg"), {"cfg": cfg_id})

    for slot_index, label, reward_type, reward_amount, weight, is_jackpot in segments:
        db.execute(
            text(
                """
                INSERT INTO roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
                VALUES (:cfg, :slot_index, :label, :reward_type, :reward_amount, :weight, :is_jackpot, NOW(), NOW())
                """
            ),
            {
                "cfg": cfg_id,
                "slot_index": slot_index,
                "label": label,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "weight": weight,
                "is_jackpot": is_jackpot,
            },
        )
    print("  ✓ Roulette segments seeded")
    db.commit()


def seed_lottery(db):
    """Seed lottery_config and lottery_prize (6 entries)."""
    print("\n=== Seeding lottery ===")

    cfg = db.execute(text("SELECT id FROM lottery_config WHERE is_active=TRUE LIMIT 1"))
    cfg_id = cfg.scalar()
    if not cfg_id:
        db.execute(
            text(
                """INSERT INTO lottery_config (name, is_active, max_daily_tickets, created_at, updated_at)
                VALUES ('Christmas Lottery', TRUE, 0, NOW(), NOW())"""
            )
        )
        cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created lottery_config id={cfg_id}")
    else:
        print(f"  ✓ Using lottery_config id={cfg_id}")

    prizes = [
        ("소형 선물", "POINT", 50, 100, 30, True),
        ("중형 선물", "POINT", 200, 50, 25, True),
        ("대형 선물", "POINT", 500, 20, 15, True),
        ("특별 선물", "POINT", 1000, 10, 10, True),
        ("잭팟", "POINT", 5000, None, 5, True),
        ("꽝", "NONE", 0, None, 15, True),
    ]

    db.execute(text("DELETE FROM lottery_prize WHERE config_id = :cfg"), {"cfg": cfg_id})

    for label, reward_type, reward_amount, stock, weight, is_active in prizes:
        db.execute(
            text(
                """
                INSERT INTO lottery_prize (config_id, label, reward_type, reward_amount, stock, weight, is_active, created_at, updated_at)
                VALUES (:cfg, :label, :reward_type, :reward_amount, :stock, :weight, :is_active, NOW(), NOW())
                """
            ),
            {
                "cfg": cfg_id,
                "label": label,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "stock": stock,
                "weight": weight,
                "is_active": is_active,
            },
        )
    print("  ✓ Lottery prizes seeded")
    db.commit()


def seed_dice(db):
    """Seed dice_config with defaults."""
    print("\n=== Seeding dice ===")

    cfg_id = db.execute(text("SELECT id FROM dice_config WHERE is_active=TRUE LIMIT 1")).scalar()

    params = {
        "name": "Christmas Dice",
        "is_active": True,
        "max_daily_plays": 0,
        "win_reward_type": "POINT",
        "win_reward_amount": 200,
        "draw_reward_type": "POINT",
        "draw_reward_amount": 50,
        "lose_reward_type": "NONE",
        "lose_reward_amount": 0,
    }

    if cfg_id:
        db.execute(
            text(
                """
                UPDATE dice_config
                SET name=:name,
                    is_active=:is_active,
                    max_daily_plays=:max_daily_plays,
                    win_reward_type=:win_reward_type,
                    win_reward_amount=:win_reward_amount,
                    draw_reward_type=:draw_reward_type,
                    draw_reward_amount=:draw_reward_amount,
                    lose_reward_type=:lose_reward_type,
                    lose_reward_amount=:lose_reward_amount,
                    updated_at=NOW()
                WHERE id=:id
                """
            ),
            {**params, "id": cfg_id},
        )
        print(f"  ✓ Updated dice_config id={cfg_id}")
    else:
        db.execute(
            text(
                """
                INSERT INTO dice_config (
                    name, is_active, max_daily_plays,
                    win_reward_type, win_reward_amount,
                    draw_reward_type, draw_reward_amount,
                    lose_reward_type, lose_reward_amount,
                    created_at, updated_at
                )
                VALUES (
                    :name, :is_active, :max_daily_plays,
                    :win_reward_type, :win_reward_amount,
                    :draw_reward_type, :draw_reward_amount,
                    :lose_reward_type, :lose_reward_amount,
                    NOW(), NOW()
                )
                """
            ),
            params,
        )
        cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created dice_config id={cfg_id}")

    db.commit()


def seed_test_user(db):
    """Create a test user in current schema."""
    print("\n=== Seeding test user ===")

    external_id = "test-user-001"
    row = db.execute(text("SELECT id FROM user WHERE external_id=:eid"), {"eid": external_id}).fetchone()
    if row:
        user_id = row[0]
        print(f"  ✓ Test user exists (id={user_id})")
    else:
        db.execute(
            text(
                """
                INSERT INTO user (external_id, nickname, status, level, xp, created_at, updated_at)
                VALUES (:eid, 'Test User', 'ACTIVE', 1, 0, NOW(), NOW());
                """
            ),
            {"eid": external_id},
        )
        user_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created test user (id={user_id})")

    db.commit()
    return user_id


def main():
    print("=" * 60)
    print("🎄 Christmas Event - Test Data Seeder")
    print("=" * 60)
    print(f"Database: {DATABASE_URL[:50]}...")

    db = SessionLocal()

    try:
        seed_feature_config(db)
        seed_feature_schedule(db)
        seed_roulette(db)
        seed_lottery(db)
        seed_dice(db)
        seed_test_user(db)

        print("\n" + "=" * 60)
        print("✅ Seeding complete!")
        print("=" * 60)
        print("\n📌 Next steps:")
        print("  1. Set TEST_MODE=true in .env for all-games access")
        print("  2. Start backend: uvicorn app.main:app --reload")
        print("  3. Start frontend: npm run dev")
        print("  4. Access: http://localhost:5173")
        print("\n🔑 Test user external_id: test-user-001")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
