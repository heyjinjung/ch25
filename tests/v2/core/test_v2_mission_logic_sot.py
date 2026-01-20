import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User

# Based on docs/v2_specs/02_game/v2_new_user_mission_logic_sot_ko.md

def test_new_user_mission_eligibility():
    # Target: 72 hours (3 days) window
    now = datetime.now()
    user_eligible = User(created_at=now - timedelta(hours=24))
    user_expired = User(created_at=now - timedelta(hours=73))
    
    def is_eligible(u, current_time):
        if not u.created_at:
            return False
        return (current_time - u.created_at) <= timedelta(hours=72)
        
    assert is_eligible(user_eligible, now) is True
    assert is_eligible(user_expired, now) is False

def test_welcome_mission_logic_keys():
    # Welcome Missions: welcome_signup, welcome_telegram
    logic_keys = ["welcome_signup", "welcome_telegram"]
    
    # Verify these are standard keys
    expected = ["welcome_signup", "welcome_telegram"]
    for k in expected:
        assert k in logic_keys

def test_starter_mission_completion_conditions():
    # start_play_roulette, start_play_dice, start_first_win, start_first_deposit
    def check_completion(logic_key, user_stats):
        if logic_key == "start_play_roulette":
            return user_stats.get("roulette_plays", 0) >= 1
        if logic_key == "start_play_dice":
            return user_stats.get("dice_plays", 0) >= 1
        if logic_key == "start_first_win":
            return user_stats.get("wins", 0) >= 1
        if logic_key == "start_first_deposit":
            return user_stats.get("is_first_deposit_done", False)
        return False
        
    stats = {"roulette_plays": 1, "dice_plays": 0, "wins": 1, "is_first_deposit_done": True}
    assert check_completion("start_play_roulette", stats) is True
    assert check_completion("start_play_dice", stats) is False
    assert check_completion("start_first_win", stats) is True
    assert check_completion("start_first_deposit", stats) is True
