import pytest
from datetime import datetime, time
from unittest.mock import patch
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.services.vault2_service import Vault2Service
from app.services.vault_service import VaultService
from app.models.dice import DiceConfig, DiceLog
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.user import User
from app.models.vault2 import VaultProgram
from app.models.vault_earn_event import VaultEarnEvent

@pytest.fixture()
def seed_dice_event_and_golden_hour(session_factory) -> None:
    session: Session = session_factory()
    today = datetime.utcnow().date()

    user = User(id=1, external_id="tester", status="ACTIVE", vault_locked_balance=1000)
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.DICE, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.DICE, title="Dice", page_path="/dice", is_enabled=True)

    dice_cfg = DiceConfig(
        name="EVENT_DICE",
        is_active=True,
        max_daily_plays=0,
        win_reward_type="POINT",
        win_reward_amount=10,  # should be ignored when event is active
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0,
    )

    # Event config with forced WIN=7777
    config_json = {
        "enable_game_earn_events": True,
        "game_earn_config": {
            "DICE": {"WIN": 7777, "DRAW": 0, "LOSE": -50}
        },
        "probability": {"DICE": {"p_win": 1.0, "p_draw": 0.0, "p_lose": 0.0}},
        "caps": {"DICE": {"daily_gain": 999999, "daily_plays": 99}},
        # Golden Hour ON with multiplier 2.0, base gate 200
        "golden_hour_config": {
            "enabled": True,
            "manual_override": "FORCE_ON",
            "multiplier": 2.0,
            "base_amount_gate": 200,
            "start_time_kst": "00:00:00",
            "end_time_kst": "23:59:59",
        },
    }

    vault_prog = VaultProgram(
        key=Vault2Service.DEFAULT_PROGRAM_KEY,
        name="Default",
        is_active=True,
        config_json=config_json,
    )

    session.add_all([user, schedule, feature_cfg, dice_cfg, vault_prog])
    session.commit()
    session.close()


@pytest.mark.usefixtures("seed_dice_event_and_golden_hour")
def test_dice_event_reward_not_doubled_by_golden_hour(client, session_factory):
    """Ensure event-mode reward is not multiplied by Golden Hour."""
    with patch("app.api.routes.dice.date") as mock_date:
        mock_date.today.return_value = datetime.utcnow().date()
        mock_date.side_effect = lambda *args, **kw: datetime(*args, **kw)

        resp = client.post("/api/dice/play")
        assert resp.status_code == 200
        data = resp.json()

    assert data["game"]["outcome"] == "WIN"
    assert data["game"]["reward_amount"] == 7777

    session: Session = session_factory()
    log = session.execute(select(DiceLog).where(DiceLog.user_id == 1)).scalar_one()
    # GH multiplier should be skipped for event mode
    earn_id = f"GAME:DICE:{log.id}"
    earn = session.execute(select(VaultEarnEvent).where(VaultEarnEvent.earn_event_id == earn_id)).scalar_one()
    assert earn.amount == 7777
    session.close()
