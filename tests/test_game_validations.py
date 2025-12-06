# /workspace/ch25/tests/test_game_validations.py
"""Unit-style validation tests for roulette, lottery, and dice services."""
from datetime import date

import pytest

from app.core.exceptions import InvalidConfigError
from app.models.feature import FeatureSchedule, FeatureType
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.roulette import RouletteConfig, RouletteSegment
from app.services.dice_service import DiceService
from app.services.lottery_service import LotteryService
from app.services.roulette_service import RouletteService


@pytest.fixture()
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_roulette_requires_six_segments(db_session):
    today = date.today()
    db_session.add(FeatureSchedule(date=today, feature_type=FeatureType.ROULETTE, is_active=True))
    config = RouletteConfig(name="TEST", is_active=True)
    db_session.add(config)
    db_session.flush()

    # Only 5 segments should fail
    for i in range(5):
        db_session.add(
            RouletteSegment(
                config_id=config.id,
                slot_index=i,
                label=f"S{i}",
                reward_type="POINT",
                reward_amount=10,
                weight=1,
            )
        )
    db_session.commit()

    service = RouletteService()
    with pytest.raises(InvalidConfigError):
        service._get_segments(db_session, config.id)  # type: ignore[attr-defined]

    # Add the 6th positive segment and validate success
    db_session.add(
        RouletteSegment(
            config_id=config.id,
            slot_index=5,
            label="S5",
            reward_type="POINT",
            reward_amount=10,
            weight=1,
        )
    )
    db_session.commit()

    segments = service._get_segments(db_session, config.id)  # type: ignore[attr-defined]
    assert len(segments) == 6


def test_lottery_requires_positive_active_weight(db_session):
    today = date.today()
    db_session.add(FeatureSchedule(date=today, feature_type=FeatureType.LOTTERY, is_active=True))
    config = LotteryConfig(name="LOTTO", is_active=True)
    db_session.add(config)
    db_session.flush()

    # Zero weight should fail at service validation (DB constraint blocks negatives)
    db_session.add(
        LotteryPrize(
            config_id=config.id,
            label="NEG",
            reward_type="POINT",
            reward_amount=1,
            weight=0,
            stock=10,
            is_active=True,
        )
    )
    db_session.commit()

    service = LotteryService()
    with pytest.raises(InvalidConfigError):
        service._eligible_prizes(db_session, config.id)  # type: ignore[attr-defined]

    # Fix with two active prizes, total weight > 0
    db_session.query(LotteryPrize).delete()
    db_session.add_all(
        [
            LotteryPrize(
                config_id=config.id,
                label="A",
                reward_type="POINT",
                reward_amount=5,
                weight=1,
                stock=10,
                is_active=True,
            ),
            LotteryPrize(
                config_id=config.id,
                label="B",
                reward_type="POINT",
                reward_amount=10,
                weight=2,
                stock=5,
                is_active=True,
            ),
        ]
    )
    db_session.commit()

    prizes = service._eligible_prizes(db_session, config.id)  # type: ignore[attr-defined]
    assert len(prizes) == 2


def test_dice_roll_range_guard():
    with pytest.raises(InvalidConfigError):
        DiceService._validate_dice_values([0, 7])
    DiceService._validate_dice_values([1, 6])
