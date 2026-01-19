"""V2 game API verification (proxy to v1 services)."""
from fastapi.testclient import TestClient

from app.models.dice import DiceConfig
from app.models.feature import FeatureConfig, FeatureType
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.user import User


def _seed_feature_configs(db) -> None:
    for feature_type, title, page_path in [
        (FeatureType.ROULETTE, "Roulette", "/roulette"),
        (FeatureType.DICE, "Dice", "/dice"),
        (FeatureType.LOTTERY, "Lottery", "/lottery"),
    ]:
        exists = (
            db.query(FeatureConfig)
            .filter(FeatureConfig.feature_type == feature_type)
            .one_or_none()
        )
        if exists is None:
            db.add(
                FeatureConfig(
                    feature_type=feature_type,
                    title=title,
                    page_path=page_path,
                    is_enabled=True,
                )
            )


def _seed_roulette(db) -> None:
    config = db.query(RouletteConfig).first()
    if config is None:
        config = RouletteConfig(
            name="Test Roulette",
            ticket_type="ROULETTE_COIN",
            is_active=True,
            max_daily_spins=10,
            grade="COMMON",
        )
        db.add(config)
        db.flush()

    if not config.segments:
        for idx in range(6):
            db.add(
                RouletteSegment(
                    config_id=config.id,
                    slot_index=idx,
                    label=f"S{idx}",
                    reward_type="POINT",
                    reward_amount=10,
                    weight=1,
                    is_jackpot=False,
                )
            )


def _seed_dice(db) -> None:
    config = db.query(DiceConfig).first()
    if config is None:
        db.add(
            DiceConfig(
                name="Test Dice",
                is_active=True,
                max_daily_plays=10,
                win_reward_type="POINT",
                win_reward_amount=10,
                draw_reward_type="NONE",
                draw_reward_amount=0,
                lose_reward_type="NONE",
                lose_reward_amount=0,
            )
        )


def _seed_lottery(db) -> None:
    config = db.query(LotteryConfig).first()
    if config is None:
        config = LotteryConfig(
            name="Test Lottery",
            is_active=True,
            max_daily_tickets=10,
        )
        db.add(config)
        db.flush()

    if not config.prizes:
        db.add(
            LotteryPrize(
                config_id=config.id,
                label="P1",
                reward_type="POINT",
                reward_amount=10,
                weight=1,
                stock=None,
                is_active=True,
            )
        )
        db.add(
            LotteryPrize(
                config_id=config.id,
                label="P2",
                reward_type="NONE",
                reward_amount=0,
                weight=1,
                stock=None,
                is_active=True,
            )
        )


def _seed_user(db) -> None:
    user = db.get(User, 1)
    if user is None:
        db.add(User(id=1, external_id="test-user-1"))


def test_v2_game_endpoints_flow(client: TestClient, session_factory) -> None:
    db = session_factory()
    try:
        _seed_user(db)
        _seed_feature_configs(db)
        _seed_roulette(db)
        _seed_dice(db)
        _seed_lottery(db)
        db.commit()
    finally:
        db.close()

    status = client.get("/api/v2/roulette/status")
    assert status.status_code == 200

    play = client.post("/api/v2/roulette/play", json={"ticket_type": "ROULETTE_COIN"})
    assert play.status_code == 200

    status = client.get("/api/v2/dice/status")
    assert status.status_code == 200

    play = client.post("/api/v2/dice/play")
    assert play.status_code == 200

    status = client.get("/api/v2/lottery/status")
    assert status.status_code == 200

    play = client.post("/api/v2/lottery/play")
    assert play.status_code == 200
