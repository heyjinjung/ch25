"""
Streak Continuity Backtest Script

배포 전 검증: 연속 스트릭이 시간대별로 올바르게 동작하는지 백테스트
"""
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.services.mission_service import MissionService


def simulate_login_scenario(
    db: Session,
    user_id: int,
    scenario_name: str,
    login_times_kst: list[tuple[date, int]],  # [(date, hour), ...]
):
    """
    Simulate multiple logins across different days/times.
    
    Args:
        login_times_kst: List of (date, hour) tuples in KST
                         Example: [(date(2026, 1, 20), 10), (date(2026, 1, 21), 2)]
    """
    print(f"\n{'='*60}")
    print(f"Scenario: {scenario_name}")
    print(f"{'='*60}")
    
    service = MissionService(db)
    
    for i, (login_date, login_hour) in enumerate(login_times_kst):
        # Create timezone-aware datetime
        login_dt = datetime(
            login_date.year,
            login_date.month,
            login_date.day,
            login_hour,
            0,
            tzinfo=ZoneInfo("Asia/Seoul")
        )
        
        print(f"\n[Step {i+1}] Login at {login_dt.strftime('%Y-%m-%d %H:%M KST')}")
        
        # Get operational play date BEFORE sync
        op_date_before = service._operational_play_date(login_dt)
        print(f"  Operational Play Date: {op_date_before}")
        
        # Get user state BEFORE sync
        user_before = db.query(User).filter(User.id == user_id).one()
        prev_streak = user_before.play_streak or 0
        prev_last_play = user_before.last_play_date
        
        print(f"  Before: streak={prev_streak}, last_play_date={prev_last_play}")
        
        # Simulate login (sync_play_streak)
        user_after = service.sync_play_streak(user_id, login_dt)
        db.commit()
        
        # Get user state AFTER sync
        db.refresh(user_after)
        new_streak = user_after.play_streak or 0
        new_last_play = user_after.last_play_date
        
        print(f"  After:  streak={new_streak}, last_play_date={new_last_play}")
        
        # Validation
        expected_increment = "YES" if prev_last_play == op_date_before - timedelta(days=1) else "NO (reset or same day)"
        actual_increment = "YES" if new_streak > prev_streak else "NO"
        
        status = "✅ PASS" if expected_increment == actual_increment else "❌ FAIL"
        print(f"  Expected Increment: {expected_increment}")
        print(f"  Actual Increment:   {actual_increment}")
        print(f"  Status: {status}")


def reset_user_streak(db: Session, user_id: int):
    """Reset user's streak to clean state for testing."""
    user = db.query(User).filter(User.id == user_id).one()
    user.play_streak = 0
    user.last_play_date = None
    db.commit()
    print(f"Reset user {user_id} streak to 0, last_play_date to None")


def run_backtest():
    """Run complete backtest suite."""
    db = SessionLocal()
    
    try:
        # Get or create test user
        test_user = db.query(User).filter(User.external_id == "BACKTEST_999").first()
        if not test_user:
            print("Creating test user...")
            test_user = User(
                external_id="BACKTEST_999",
                telegram_id=999999999,
                telegram_username="backtest_user",
                nickname="Backtest User",
                play_streak=0
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        
        user_id = test_user.id
        print(f"Using test user ID: {user_id}")
        
        # Scenario 1: Normal Daily Progression
        reset_user_streak(db, user_id)
        simulate_login_scenario(
            db, user_id,
            "Scenario 1: Normal Daily Progression (10 AM each day)",
            [
                (date(2026, 1, 20), 10),  # Day 1, 10 AM
                (date(2026, 1, 21), 10),  # Day 2, 10 AM
                (date(2026, 1, 22), 10),  # Day 3, 10 AM
            ]
        )
        
        # Scenario 2: Early Morning Login (Before 9AM Reset)
        reset_user_streak(db, user_id)
        simulate_login_scenario(
            db, user_id,
            "Scenario 2: Early Morning Login (2 AM before 9 AM reset)",
            [
                (date(2026, 1, 20), 10),  # Day 1, 10 AM → streak = 1
                (date(2026, 1, 21), 2),   # Day 2, 2 AM → should STAY 1 (operational day = Day 1)
                (date(2026, 1, 21), 10),  # Day 2, 10 AM → should become 2
            ]
        )
        
        # Scenario 3: Late Night Edge Case
        reset_user_streak(db, user_id)
        simulate_login_scenario(
            db, user_id,
            "Scenario 3: Late Night Edge (11:50 PM → 12:01 AM → 9:01 AM)",
            [
                (date(2026, 1, 20), 23),  # Day 1, 11 PM → streak = 1
                (date(2026, 1, 21), 0),   # Day 2, 12:01 AM → should STAY 1 (operational day = Day 1)
                (date(2026, 1, 21), 9),   # Day 2, 9:01 AM → should become 2
            ]
        )
        
        # Scenario 4: Streak Break Detection
        reset_user_streak(db, user_id)
        simulate_login_scenario(
            db, user_id,
            "Scenario 4: Streak Break (Skip a day)",
            [
                (date(2026, 1, 20), 10),  # Day 1 → streak = 1
                (date(2026, 1, 21), 10),  # Day 2 → streak = 2
                (date(2026, 1, 22), 10),  # Day 3 → streak = 3
                # Skip Day 4 (2026-01-23)
                (date(2026, 1, 24), 10),  # Day 5 → should RESET to 1
            ]
        )
        
        # Scenario 5: Multi-Session Same Day
        reset_user_streak(db, user_id)
        simulate_login_scenario(
            db, user_id,
            "Scenario 5: Multi-Session Same Day (No Double-Count)",
            [
                (date(2026, 1, 20), 10),  # Day 1, 10 AM → streak = 1
                (date(2026, 1, 20), 15),  # Day 1, 3 PM → should STAY 1 (same day)
                (date(2026, 1, 20), 22),  # Day 1, 10 PM → should STAY 1 (same day)
            ]
        )
        
        print("\n" + "="*60)
        print("Backtest Complete!")
        print("="*60)
        print("\nReview results above. All tests should show ✅ PASS")
        
    finally:
        db.close()


if __name__ == "__main__":
    run_backtest()
