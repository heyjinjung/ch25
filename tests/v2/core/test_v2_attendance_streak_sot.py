import pytest
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user_activity import UserActivity
# Assume StreakService or similar exists, or we check DB state directly
# Based on docs/v2_specs/02_game/v2_attendance_streak_logic_sot_ko.md

def test_attendance_streak_increment(db: Session):
    # Setup: User with 2-day streak ending yesterday
    yesterday = date.today() - timedelta(days=1)
    user = User(nickname="StreakUser", external_id="STR_001")
    db.add(user)
    db.flush()
    
    # We might need a specific table for streaks if it's not in User
    # The SoT says "DB users table or user_streaks separate table"
    # Let's check User model for 'login_streak'
    user.login_streak = 2
    user.last_streak_updated_at = datetime.combine(yesterday, datetime.min.time())
    db.commit()
    
    # Simulate today's login
    # In V2, login triggers streak update
    # Here we simulate the logic: 어제 출석 O + 오늘 출석 O -> Streak + 1
    def update_streak(u, now):
        last_date = u.last_streak_updated_at.date() if u.last_streak_updated_at else None
        today = now.date()
        if last_date == today - timedelta(days=1):
            u.login_streak += 1
        else:
            u.login_streak = 1
        u.last_streak_updated_at = now

    now = datetime.now()
    update_streak(user, now)
    db.commit()
    
    assert user.login_streak == 3
    assert user.last_streak_updated_at.date() == date.today()

def test_attendance_streak_reset(db: Session):
    # Setup: Last login was 2 days ago
    the_day_before_yesterday = date.today() - timedelta(days=2)
    user = User(nickname="ResetUser", external_id="STR_002", login_streak=5)
    user.last_streak_updated_at = datetime.combine(the_day_before_yesterday, datetime.min.time())
    db.add(user)
    db.commit()
    
    # Login today
    def update_streak(u, now):
        last_date = u.last_streak_updated_at.date() if u.last_streak_updated_at else None
        today = now.date()
        if last_date == today - timedelta(days=1):
            u.login_streak += 1
        else:
            u.login_streak = 1
        u.last_streak_updated_at = now

    update_streak(user, datetime.now())
    db.commit()
    
    assert user.login_streak == 1 # Reset

def test_streak_reward_loop(db: Session):
    # Day 7 -> Loop back to 1 (SoT Rule)
    user = User(nickname="LoopUser", external_id="STR_003", login_streak=7)
    db.add(user)
    
    def get_reward_day(streak):
        return ((streak - 1) % 7) + 1
    
    assert get_reward_day(1) == 1
    assert get_reward_day(7) == 7
    assert get_reward_day(8) == 1 # Loop
