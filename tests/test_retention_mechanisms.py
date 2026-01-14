
import pytest
from datetime import datetime
from app.api.routes.vault import service as vault_service
from app.services.trial_grant_service import TrialGrantService
from app.services.mission_service import MissionService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.core.config import get_settings

def _seed_user(db, user_id=1, vault_balance=10000):
    user = User(id=user_id, external_id=f"u{user_id}", nickname="tester", vault_locked_balance=vault_balance)
    db.add(user)
    db.commit()
    return user

def _seed_mission(db, logic_key="daily_login_gift"):
    mission = Mission(
        title="Daily Gift",
        category=MissionCategory.DAILY,
        logic_key=logic_key,
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=1,
        xp_reward=0,
        is_active=True
    )
    db.add(mission)
    db.commit()
    return mission

def test_ticket_zero_detection(session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db, user_id=1, vault_balance=10000)

    # Case 1: Zero Tickets
    # (No wallet entries = 0 balance)
    
    # Mock datetime for vault status
    monkeypatch.setattr(vault_service, "get_status", lambda db, user_id, now: (True, db.query(User).get(user_id), False))
    
    # We need to invoke the logic inside router.status, but router logic is mixed with serialization.
    # We'll reproduce the critical check logic here or use the TestClient for full integration.
    # Unit testing the logic:
    
    ticket_token_types = (GameTokenType.DICE_TOKEN, GameTokenType.ROULETTE_COIN, GameTokenType.LOTTERY_TICKET, GameTokenType.TRIAL_TOKEN)
    
    def check_ticket_zero(uid):
        balances = []
        for tt in ticket_token_types:
            row = db.query(UserGameWallet).filter_by(user_id=uid, token_type=tt).first()
            balances.append(int(row.balance) if row else 0)
        return all(b <= 0 for b in balances)

    assert check_ticket_zero(1) is True

    # Case 2: Has TRIAL TOKENS -> Not Ticket Zero
    ws = GameWalletService()
    ws.grant_tokens(db, 1, GameTokenType.TRIAL_TOKEN, 1, "TEST")
    assert check_ticket_zero(1) is False

def test_trial_grant_redirection_and_cap(session_factory):
    db = session_factory()
    _seed_user(db, user_id=2)
    tgs = TrialGrantService()
    
    # 1. Request ROULETTE -> Should grant TRIAL (Redirection)
    # Ensure wallet is empty first
    granted, balance, label = tgs.grant_daily_if_empty(db, 2, GameTokenType.ROULETTE_COIN)
    
    # Expectation: Granted 3 TRIAL tokens (as per service logic)
    assert granted == 3
    
    # Check Wallet
    ws = GameWalletService()
    trial_bal = ws.get_balance(db, 2, GameTokenType.TRIAL_TOKEN)
    roulette_bal = ws.get_balance(db, 2, GameTokenType.ROULETTE_COIN)
    
    assert trial_bal == 3
    assert roulette_bal == 0
    assert "TRIAL_TRIAL_TOKEN" in label
    # Logic: label = f"TRIAL_{grant_token_type.value}_{today_kst.isoformat()}"
    # grant_token_type is TRIAL_TOKEN. So label contains 'trial_token'.

    # 2. Daily Cap check
    # Service has hardcoded _daily_total_cap = 3.
    # We just granted 3.
    # Next request should fail.
    
    # We need to consume them first because `grant_daily_if_empty` checks balance > 0
    # Let's manually deduct to simulate usage
    ws.require_and_consume_token(db, 2, GameTokenType.TRIAL_TOKEN, 3, "PLAY", "test")
    
    # Request again
    granted, balance, label = tgs.grant_daily_if_empty(db, 2, GameTokenType.DICE_TOKEN)
    
    # Should fail due to Daily Cap (we already granted 3 today)
    assert granted == 0

def test_mission_highlight(session_factory):
    db = session_factory()
    _seed_user(db, user_id=3)
    _seed_mission(db, "daily_login_gift")
    _seed_mission(db, "other_mission")
    
    ms = MissionService(db)
    missions = ms.get_user_missions(3)
    
    gift_mission = next(m for m in missions if m["mission"]["logic_key"] == "daily_login_gift")
    other_mission = next(m for m in missions if m["mission"]["logic_key"] == "other_mission")
    
    assert gift_mission["mission"]["is_featured"] is True
    assert other_mission["mission"]["is_featured"] is False
