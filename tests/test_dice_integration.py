"""Dice endpoint integration tests with seeded config and feature schedule."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.dice import DiceConfig
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.user import User


@pytest.fixture()
def seed_dice(session_factory) -> None:
    session: Session = session_factory()
    today = date.today()

    user = User(id=1, external_id="tester", status="ACTIVE")
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.DICE, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.DICE, title="Dice Day", page_path="/dice", is_enabled=True)
    dice_cfg = DiceConfig(
        name="TEST_DICE",
        is_active=True,
        max_daily_plays=0,
        win_reward_type="POINT",
        win_reward_amount=1,
        draw_reward_type="POINT",
        draw_reward_amount=1,
        lose_reward_type="NONE",
        lose_reward_amount=0,
    )
    session.add_all([user, schedule, feature_cfg, dice_cfg])
    session.commit()
    session.close()


@pytest.mark.usefixtures("seed_dice")
def test_dice_status_unlimited(client: TestClient) -> None:
    response = client.get("/api/dice/status")
    assert response.status_code == 200
    data = response.json()
    assert data["max_daily_plays"] == 0
    assert data["today_plays"] == 0


@pytest.mark.usefixtures("seed_dice")
def test_dice_play_returns_result(client: TestClient) -> None:
    response = client.post("/api/dice/play")
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "OK"
    assert "game" in data
