
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.dice import DiceConfig, DiceLog
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.user import User
from app.models.vault2 import VaultProgram
from app.models.vault_earn_event import VaultEarnEvent
from app.services.vault2_service import Vault2Service
from unittest.mock import patch
from datetime import datetime

@pytest.fixture()
def seed_dice_event(session_factory) -> None:
    session: Session = session_factory()
    today = date.today()

    # Base User & Feature Setup
    user = User(id=1, external_id="tester", status="ACTIVE", vault_locked_balance=20000)
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.DICE, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.DICE, title="Dice Event", page_path="/dice", is_enabled=True)
    
    # Standard Dice Config (Fallback / Visuals)
    dice_cfg = DiceConfig(
        name="NORMAL_DICE",
        is_active=True,
        max_daily_plays=0,
        win_reward_type="POINT",
        win_reward_amount=10,
        draw_reward_type="POINT",
        draw_reward_amount=5,
        lose_reward_type="NONE",
        lose_reward_amount=0,
    )
    
    # Vault Program with Event Config
    # Force 100% WIN for testing
    config_json = {
        "enable_game_earn_events": True,
        "game_earn_config": {
            "DICE": {"WIN": 7777, "DRAW": -100, "LOSE": -200}
        },
        "probability": {
            "DICE": {"p_win": 1.0, "p_draw": 0.0, "p_lose": 0.0}
        },
        "caps": {
            "DICE": {"daily_gain": 50000, "daily_plays": 100}
        },
        "eligibility": {
            "tags": {"blocklist": ["Blacklist"]}
        }
    }
    
    vault_prog = VaultProgram(
        key=Vault2Service.DEFAULT_PROGRAM_KEY,
        name="Event Vault",
        is_active=True,
        config_json=config_json
    )

    session.add_all([user, schedule, feature_cfg, dice_cfg, vault_prog])
    session.commit()
    session.close()

@pytest.mark.usefixtures("seed_dice_event")
def test_dice_play_event_mode_win(client: TestClient, session_factory):
    """Verify that event mode overrides standard config."""
    # Mock date to ensure app uses UTC date matching DB default
    with patch("app.api.routes.dice.date") as mock_date:
        # Use datetime.utcnow().date() because DiceLog uses UTC default
        mock_date.today.return_value = datetime.utcnow().date()
        mock_date.side_effect = lambda *args, **kw: date(*args, **kw)

        # Action
        response = client.post("/api/dice/play")
        assert response.status_code == 200
        data = response.json()
        
        # Assertions
        game = data["game"]
        # 1. Outcome should be WIN (1.0 probability)
        assert game["outcome"] == "WIN"
        # 2. Reward Amount should be 7777 (Event Config), not 10 (DiceConfig)
        assert game["reward_amount"] == 7777
        
        # 3. Verify Vault Accrual
        assert data["vault_earn"] == 7777
        
        # 4. Verify DB Logs
        session = session_factory()
        # DiceLog should show 7777
        log = session.execute(select(DiceLog).where(DiceLog.user_id==1)).scalar_one()
        assert log.reward_amount == 7777
        
        # VaultEarnEvent check 
        # earn_event_id = "GAME:DICE:{log.id}" as per VaultService logic
        expected_earn_id = f"GAME:DICE:{log.id}"
        earn = session.execute(select(VaultEarnEvent).where(VaultEarnEvent.earn_event_id==expected_earn_id)).scalar_one()
        assert earn.amount == 7777
        session.close()

@pytest.mark.usefixtures("seed_dice_event")
def test_dice_caps_daily_plays(client: TestClient, session_factory):
    # Update config to limit plays to 1
    from sqlalchemy.orm.attributes import flag_modified
    session = session_factory()
    prog = session.query(VaultProgram).one()
    cfg = prog.config_json.copy()
    cfg["caps"]["DICE"]["daily_plays"] = 1
    prog.config_json = cfg
    flag_modified(prog, "config_json")
    session.commit()
    session.close()
    
    with patch("app.api.routes.dice.date") as mock_date:
        mock_date.today.return_value = datetime.utcnow().date()
        mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
    
        # 1st Play: Success (Event Mode)
        resp1 = client.post("/api/dice/play")
        assert resp1.status_code == 200
        assert resp1.json()["game"]["reward_amount"] == 7777 # Event config

        # 2nd Play: Should fallback to Normal Mode because cap reached >= 1
        resp2 = client.post("/api/dice/play")
        assert resp2.status_code == 200
        game2 = resp2.json()["game"]
        
        # Verify Fallback: Reward should NOT be 7777 (it should be 10, 5, or 0 from Normal config)
        assert game2["reward_amount"] != 7777
