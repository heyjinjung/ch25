"""Lottery endpoint integration tests with seeded config and schedule."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.user import User


@pytest.fixture()
def seed_lottery(session_factory) -> None:
    session: Session = session_factory()
    today = date.today()

    user = User(id=1, external_id="tester", status="ACTIVE")
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.LOTTERY, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.LOTTERY, title="Lottery Day", page_path="/lottery", is_enabled=True)
    lotto_cfg = LotteryConfig(name="TEST_LOTTERY", is_active=True, max_daily_tickets=0)
    prize = LotteryPrize(
        config=lotto_cfg,
        label="P1",
        reward_type="POINT",
        reward_amount=5,
        weight=1,
        stock=10,
        is_active=True,
    )
    session.add_all([user, schedule, feature_cfg, lotto_cfg, prize])
    session.commit()
    session.close()


@pytest.mark.usefixtures("seed_lottery")
def test_lottery_status_unlimited(client: TestClient) -> None:
    resp = client.get("/api/lottery/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["max_daily_tickets"] == 0
    assert data["today_tickets"] == 0
    assert len(data["prize_preview"]) == 1


@pytest.mark.usefixtures("seed_lottery")
def test_lottery_play_returns_prize(client: TestClient) -> None:
    resp = client.post("/api/lottery/play")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["prize"]["reward_type"] == "POINT"
