"""Integration tests for roulette, dice, and lottery play endpoints."""
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.dice import DiceConfig, DiceLog
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType, UserEventLog
from app.models.lottery import LotteryConfig, LotteryLog, LotteryPrize
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.models.user import User


def seed_common(session: Session, feature_type: FeatureType) -> None:
    today = date.today()
    # Ensure user exists for FK references
    session.add(User(id=1, external_id="tester", status="ACTIVE"))
    session.add(FeatureConfig(feature_type=feature_type, title=f"{feature_type.value}", page_path=f"/{feature_type.value.lower()}"))
    session.add(FeatureSchedule(date=today, feature_type=feature_type, is_active=True))


def test_roulette_play_logs_and_rewards(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    seed_common(session, FeatureType.ROULETTE)
    cfg = RouletteConfig(name="ROU", is_active=True)
    session.add(cfg)
    session.flush()
    for idx in range(6):
        session.add(
            RouletteSegment(
                config_id=cfg.id,
                slot_index=idx,
                label=f"S{idx}",
                reward_type="POINT",
                reward_amount=10,
                weight=1,
            )
        )
    session.commit()
    session.close()

    resp = client.post("/api/roulette/play")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["segment"]["reward_type"] == "POINT"

    verify: Session = session_factory()
    assert verify.query(RouletteLog).count() == 1
    assert verify.query(UserEventLog).count() == 1
    verify.close()


def test_dice_play_logs_and_rewards(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    seed_common(session, FeatureType.DICE)
    cfg = DiceConfig(
        name="DICE",
        is_active=True,
        win_reward_type="POINT",
        win_reward_amount=5,
        draw_reward_type="POINT",
        draw_reward_amount=1,
        lose_reward_type="NONE",
        lose_reward_amount=0,
    )
    session.add(cfg)
    session.commit()
    session.close()

    resp = client.post("/api/dice/play")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["game"]["reward_type"] in {"POINT", "NONE"}

    verify: Session = session_factory()
    assert verify.query(DiceLog).count() == 1
    assert verify.query(UserEventLog).count() == 1
    verify.close()


def test_lottery_play_decrements_stock_and_logs(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    seed_common(session, FeatureType.LOTTERY)
    cfg = LotteryConfig(name="LOTTO", is_active=True)
    session.add(cfg)
    session.flush()
    session.add(
        LotteryPrize(
            config_id=cfg.id,
            label="P1",
            reward_type="POINT",
            reward_amount=5,
            weight=1,
            stock=1,
            is_active=True,
        )
    )
    session.commit()
    session.close()

    resp = client.post("/api/lottery/play")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["prize"]["reward_type"] == "POINT"

    verify: Session = session_factory()
    prize = verify.query(LotteryPrize).first()
    assert prize.stock == 0
    assert verify.query(LotteryLog).count() == 1
    assert verify.query(UserEventLog).count() == 1
    verify.close()
