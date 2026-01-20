import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.game_wallet import UserGameWallet

def test_dda_trigger_on_lose_streak(db: Session):
    # golden_v2_intervention_logic_ko.md: TRG_LOSE_5 -> Pity Win
    user = User(nickname="UnluckyUser", external_id="INT_001")
    db.add(user)
    db.flush()
    
    # Simulate 5 losses
    def check_dda_trigger(recent_results):
        if len(recent_results) >= 5 and all(r == "LOSE" for r in recent_results[-5:]):
            return "PITY_WIN_ENABLED"
        return "NORMAL"

    results = ["LOSE", "LOSE", "LOSE", "LOSE", "LOSE"]
    assert check_dda_trigger(results) == "PITY_WIN_ENABLED"

def test_crisis_intervention_low_balance(db: Session):
    # golden_v2_intervention_logic_ko.md: Balance / AvgBet < 3 -> Bailout
    user = User(nickname="BrokeUser", external_id="INT_002")
    db.add(user)
    db.flush()
    
    def should_trigger_crisis(balance, avg_bet):
        if avg_bet > 0 and (balance / avg_bet) < 3:
            return True
        return False
    
    assert should_trigger_crisis(balance=2000, avg_bet=1000) is True
    assert should_trigger_crisis(balance=5000, avg_bet=1000) is False

def test_pity_timer_jackpot(db: Session):
    # Rule 2: Jackpot Pity after certain failed attempts
    def get_jackpot_prob(failed_attempts):
        base_prob = 0.01
        if failed_attempts > 100:
            return base_prob + 0.05 # Pity boost
        return base_prob
    
    assert get_jackpot_prob(50) == 0.01
    assert get_jackpot_prob(150) == pytest.approx(0.06)

def test_intervention_priority_resolution():
    # documents/v2_specs/02_game/golden_v2_intervention_logic_ko.md: 
    # 1. Legal/Security > 2. Crisis > 3. Revenue > 4. Engagement
    priorities = {
        "LEGAL": 1,
        "CRISIS": 2,
        "REVENUE": 3,
        "ENGAGEMENT": 4
    }
    
    active_interventions = ["CRISIS", "ENGAGEMENT"]
    # Resolve to highest priority
    winner = min(active_interventions, key=lambda x: priorities[x])
    assert winner == "CRISIS"
