"""Roulette endpoint integration tests with seeded config and schedule."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.user import User


def _segments(config: RouletteConfig) -> list[RouletteSegment]:
    return [
        RouletteSegment(config=config, slot_index=i, label=f"S{i}", reward_type="POINT", reward_amount=1, weight=1)
        for i in range(6)
    ]


@pytest.fixture()
def seed_roulette(session_factory) -> None:
    session: Session = session_factory()
    today = date.today()

    user = User(id=1, external_id="tester", status="ACTIVE")
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.ROULETTE, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.ROULETTE, title="Roulette Day", page_path="/roulette", is_enabled=True)
    roulette_cfg = RouletteConfig(name="TEST_ROULETTE", is_active=True, max_daily_spins=0)
    session.add_all([user, schedule, feature_cfg, roulette_cfg])
    session.flush()
    session.add_all(_segments(roulette_cfg))
    session.commit()
    session.close()


@pytest.mark.usefixtures("seed_roulette")
def test_roulette_status_unlimited(client: TestClient) -> None:
    resp = client.get("/api/roulette/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["max_daily_spins"] == 0
    assert data["today_spins"] == 0
    assert len(data["segments"]) == 6


@pytest.mark.usefixtures("seed_roulette")
def test_roulette_play_returns_segment(client: TestClient) -> None:
    resp = client.post("/api/roulette/play")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["segment"]["reward_type"] == "POINT"
