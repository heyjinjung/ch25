"""TDD: V2 game config validation."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.exceptions import InvalidConfigError
from app.v2.db.base import Base
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_dice import V2DiceConfig
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize
from app.v2.services.game_config_service import V2GameConfigService


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_roulette_config_validation_success():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        config = V2RouletteConfig(
            name="기본 룰렛",
            ticket_type="ROULETTE_TICKET",
            is_active=True,
            max_daily_spins=0,
            grade="COMMON",
        )
        db.add(config)
        db.flush()
        segments = [
            V2RouletteSegment(
                config_id=config.id,
                slot_index=i,
                label=f"slot-{i}",
                reward_type="POINT",
                reward_amount=10,
                weight=1,
            )
            for i in range(6)
        ]
        db.add_all(segments)
        db.commit()

        found_config, found_segments = V2GameConfigService.get_active_roulette_config(db)
        assert found_config.id == config.id
        assert len(found_segments) == 6
    finally:
        db.close()


def test_roulette_config_validation_fails_on_segments():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        config = V2RouletteConfig(
            name="불량 룰렛",
            ticket_type="ROULETTE_TICKET",
            is_active=True,
            max_daily_spins=0,
            grade="COMMON",
        )
        db.add(config)
        db.flush()
        db.add(
            V2RouletteSegment(
                config_id=config.id,
                slot_index=0,
                label="slot-0",
                reward_type="POINT",
                reward_amount=10,
                weight=1,
            )
        )
        db.commit()

        with pytest.raises(InvalidConfigError):
            V2GameConfigService.get_active_roulette_config(db)
    finally:
        db.close()


def test_lottery_config_validation_fails_on_prize_weights():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        config = V2LotteryConfig(
            name="기본 복권",
            ticket_type="LOTTERY_TICKET",
            is_active=True,
            max_daily_tickets=0,
        )
        db.add(config)
        db.flush()
        db.add(
            V2LotteryPrize(
                config_id=config.id,
                label="1등",
                reward_type="POINT",
                reward_amount=100,
                weight=0,
                is_active=True,
            )
        )
        db.commit()

        with pytest.raises(InvalidConfigError):
            V2GameConfigService.get_active_lottery_config(db)
    finally:
        db.close()


def test_dice_config_validation_success():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        config = V2DiceConfig(
            name="기본 주사위",
            ticket_type="DICE_TICKET",
            is_active=True,
            max_daily_plays=0,
            win_reward_type="POINT",
            win_reward_amount=10,
            draw_reward_type="NONE",
            draw_reward_amount=0,
            lose_reward_type="POINT",
            lose_reward_amount=-5,
        )
        db.add(config)
        db.commit()

        found_config = V2GameConfigService.get_active_dice_config(db)
        assert found_config.id == config.id
    finally:
        db.close()
