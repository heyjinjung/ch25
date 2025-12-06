"""
Test data seeding script for local development/testing.

Usage:
    python scripts/seed_test_data.py

This script:
1. Creates feature_config for all game types
2. Creates feature_schedule for today (all games)
3. Creates roulette segments
4. Creates lottery prizes
5. Creates dice config
6. Creates a test user with season pass progress

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
    """Seed feature_config table with all game types."""
    print("\n=== Seeding feature_config ===")
    
    features = [
        ("ROULETTE", True, 0),  # 0 = unlimited
        ("DICE", True, 0),
        ("LOTTERY", True, 0),
        ("RANKING", True, 0),
        ("SEASON_PASS", True, 0),
    ]
    
    for feature_type, is_enabled, max_daily in features:
        db.execute(text("""
            INSERT INTO feature_config (feature_type, is_enabled, max_daily_plays)
            VALUES (:feature_type, :is_enabled, :max_daily)
            ON DUPLICATE KEY UPDATE is_enabled = :is_enabled, max_daily_plays = :max_daily
        """), {"feature_type": feature_type, "is_enabled": is_enabled, "max_daily": max_daily})
        print(f"  ✓ {feature_type}: enabled={is_enabled}, max_daily={max_daily}")
    
    db.commit()


def seed_feature_schedule(db):
    """Seed feature_schedule with today's date for all features (or ROULETTE as primary)."""
    print("\n=== Seeding feature_schedule ===")
    
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    
    # In production, only one feature per day. For testing, we use TEST_MODE.
    # But we still need at least one schedule entry for the /today endpoint.
    db.execute(text("""
        INSERT INTO feature_schedule (`date`, feature_type, is_active)
        VALUES (:today, 'ROULETTE', TRUE)
        ON DUPLICATE KEY UPDATE feature_type = 'ROULETTE', is_active = TRUE
    """), {"today": today})
    
    print(f"  ✓ {today}: ROULETTE (use TEST_MODE=true for all games)")
    db.commit()


def seed_roulette_segments(db):
    """Seed roulette_segment table."""
    print("\n=== Seeding roulette_segment ===")
    
    segments = [
        ("🎁 100 포인트", 30, "POINT", 100, False),
        ("🎄 200 포인트", 25, "POINT", 200, False),
        ("⭐ 500 포인트", 15, "POINT", 500, False),
        ("🏆 1000 포인트", 8, "POINT", 1000, True),  # Jackpot
        ("💎 2000 포인트", 5, "POINT", 2000, True),  # Jackpot
        ("😢 꽝", 17, "NONE", 0, False),
    ]
    
    # Clear existing
    db.execute(text("DELETE FROM roulette_segment"))
    
    for i, (label, weight, reward_type, reward_amount, is_jackpot) in enumerate(segments):
        db.execute(text("""
            INSERT INTO roulette_segment (segment_order, label, weight, reward_type, reward_amount, is_jackpot)
            VALUES (:order, :label, :weight, :reward_type, :reward_amount, :is_jackpot)
        """), {
            "order": i,
            "label": label,
            "weight": weight,
            "reward_type": reward_type,
            "reward_amount": reward_amount,
            "is_jackpot": is_jackpot,
        })
        print(f"  ✓ {label}: weight={weight}, jackpot={is_jackpot}")
    
    db.commit()


def seed_lottery_prizes(db):
    """Seed lottery_prize table."""
    print("\n=== Seeding lottery_prize ===")
    
    prizes = [
        ("🎁 소형 선물", "POINT", 50, 100, True),
        ("🎄 중형 선물", "POINT", 200, 50, True),
        ("⭐ 대형 선물", "POINT", 500, 20, True),
        ("🏆 특별 선물", "POINT", 1000, 5, True),
        ("💎 잭팟!", "POINT", 5000, 1, True),
    ]
    
    # Clear existing
    db.execute(text("DELETE FROM lottery_prize"))
    
    for label, reward_type, reward_value, stock, is_active in prizes:
        db.execute(text("""
            INSERT INTO lottery_prize (label, reward_type, reward_value, stock, is_active)
            VALUES (:label, :reward_type, :reward_value, :stock, :is_active)
        """), {
            "label": label,
            "reward_type": reward_type,
            "reward_value": reward_value,
            "stock": stock,
            "is_active": is_active,
        })
        print(f"  ✓ {label}: {reward_type} +{reward_value}, stock={stock}")
    
    db.commit()


def seed_test_user(db):
    """Create a test user with season pass progress."""
    print("\n=== Seeding test user ===")
    
    test_user_id = "test-user-001"
    
    # Check if user exists
    result = db.execute(text("SELECT id FROM users WHERE external_id = :id"), {"id": test_user_id}).fetchone()
    
    if result:
        user_pk = result[0]
        print(f"  ✓ Test user exists: {test_user_id} (pk={user_pk})")
    else:
        db.execute(text("""
            INSERT INTO users (external_id, display_name, created_at)
            VALUES (:id, 'Test User', NOW())
        """), {"id": test_user_id})
        user_pk = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created test user: {test_user_id} (pk={user_pk})")
    
    db.commit()
    return user_pk


def seed_season_pass(db, user_pk: int):
    """Seed season pass levels and user progress."""
    print("\n=== Seeding season pass ===")
    
    # Check if season exists
    season = db.execute(text("SELECT id FROM seasons WHERE is_active = TRUE")).fetchone()
    
    if not season:
        db.execute(text("""
            INSERT INTO seasons (name, start_date, end_date, is_active)
            VALUES ('Christmas 2024', '2024-12-01', '2024-12-31', TRUE)
        """))
        season_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        print(f"  ✓ Created season: Christmas 2024 (id={season_id})")
    else:
        season_id = season[0]
        print(f"  ✓ Using existing season (id={season_id})")
    
    # Seed levels
    levels = [
        (1, 0, "🎁 스타터 박스", "POINT", 100),
        (2, 100, "🎄 실버 박스", "POINT", 200),
        (3, 300, "⭐ 골드 박스", "POINT", 500),
        (4, 600, "🏆 플래티넘 박스", "POINT", 1000),
        (5, 1000, "💎 다이아몬드 박스", "POINT", 2000),
    ]
    
    for level, required_xp, reward_label, reward_type, reward_value in levels:
        db.execute(text("""
            INSERT INTO season_levels (season_id, level, required_xp, reward_label, reward_type, reward_value)
            VALUES (:season_id, :level, :required_xp, :reward_label, :reward_type, :reward_value)
            ON DUPLICATE KEY UPDATE required_xp = :required_xp, reward_label = :reward_label
        """), {
            "season_id": season_id,
            "level": level,
            "required_xp": required_xp,
            "reward_label": reward_label,
            "reward_type": reward_type,
            "reward_value": reward_value,
        })
        print(f"  ✓ Level {level}: {reward_label} (XP >= {required_xp})")
    
    # User progress
    db.execute(text("""
        INSERT INTO user_season_progress (user_id, season_id, current_xp, current_level)
        VALUES (:user_id, :season_id, 150, 2)
        ON DUPLICATE KEY UPDATE current_xp = 150, current_level = 2
    """), {"user_id": user_pk, "season_id": season_id})
    print(f"  ✓ User progress: Level 2, XP 150")
    
    db.commit()


def main():
    print("=" * 60)
    print("🎄 Christmas Event - Test Data Seeder")
    print("=" * 60)
    print(f"Database: {DATABASE_URL[:50]}...")
    
    db = SessionLocal()
    
    try:
        seed_feature_config(db)
        seed_feature_schedule(db)
        seed_roulette_segments(db)
        seed_lottery_prizes(db)
        user_pk = seed_test_user(db)
        seed_season_pass(db, user_pk)
        
        print("\n" + "=" * 60)
        print("✅ Seeding complete!")
        print("=" * 60)
        print("\n📌 Next steps:")
        print("  1. Set TEST_MODE=true in .env for all-games access")
        print("  2. Start backend: uvicorn app.main:app --reload")
        print("  3. Start frontend: npm run dev")
        print("  4. Access: http://localhost:5173")
        print("\n🔑 Test user ID: test-user-001")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
