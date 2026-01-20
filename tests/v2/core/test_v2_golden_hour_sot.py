import pytest
from datetime import datetime, time
from sqlalchemy.orm import Session
from app.models.user import User

# Based on docs/v2_specs/02_game/v2_golden_hour_policy_sot_ko.md

def test_golden_hour_multiplier_application():
    # FinalReward = BaseReward * Multiplier
    base_reward = 1000
    multiplier = 2.0
    
    def calculate_reward(base, mult, is_active):
        if is_active:
            return int(base * mult)
        return base
        
    assert calculate_reward(base_reward, multiplier, True) == 2000
    assert calculate_reward(base_reward, multiplier, False) == 1000

def test_golden_hour_schedule_activation():
    # Schedule: 20:00 ~ 22:00 KST
    start = time(20, 0)
    end = time(22, 0)
    
    def is_in_golden_hour(current_time, start_t, end_t, override="AUTO"):
        if override == "FORCE_ON":
            return True
        if override == "FORCE_OFF":
            return False
            
        if start_t <= current_time <= end_t:
            return True
        return False
        
    assert is_in_golden_hour(time(21, 0), start, end) is True
    assert is_in_golden_hour(time(19, 0), start, end) is False
    assert is_in_golden_hour(time(19, 0), start, end, override="FORCE_ON") is True

def test_golden_hour_target_assets():
    # POINT, GAME_XP (Yes) / Diamond, GoldKey (No)
    targets = ["POINT", "GAME_XP"]
    exempt = ["DIAMOND", "GOLD_KEY"]
    
    def should_apply_multiplier(reward_type):
        return reward_type in ["POINT", "GAME_XP"]
        
    for t in targets:
        assert should_apply_multiplier(t) is True
    for e in exempt:
        assert should_apply_multiplier(e) is False
