from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.exceptions import DailyLimitReachedError
from app.v2.models import GameTokenType, UserGameWallet
from app.v2.models.user import V2User
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryLog, V2LotteryPrize
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteLog, V2RouletteSegment
from app.v2.services.v2_lottery_game_service import V2LotteryGameService
from app.v2.services.v2_roulette_game_service import V2RouletteGameService


_KST = ZoneInfo("Asia/Seoul")


def _create_v2_user(db, *, user_id: int = 1) -> V2User:
    # 신규 유저(가입 7일 이내)로 만들어 benefits_suspended 자동 제재를 회피
    user = V2User(
        id=user_id,
        cc_id=f"cc_{user_id}",
        nickname=f"user_{user_id}",
        created_at=(datetime.now(timezone.utc) - timedelta(days=1)),
        benefits_suspended_manual=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _seed_wallet(db, *, user_id: int, token_type: GameTokenType, balance: int) -> None:
    db.add(UserGameWallet(user_id=user_id, token_type=token_type, balance=int(balance)))
    db.commit()


def _seed_valid_roulette_config(db, *, ticket_type: str = "ROULETTE_TICKET", max_daily_spins: int = 0) -> V2RouletteConfig:
    config = V2RouletteConfig(
        name="TEST_ROULETTE",
        ticket_type=ticket_type,
        is_active=True,
        max_daily_spins=int(max_daily_spins),
        grade="COMMON",
    )
    db.add(config)
    db.flush()

    # 6 segments: weights 합 > 0
    segments: list[V2RouletteSegment] = []
    for slot_index in range(6):
        segments.append(
            V2RouletteSegment(
                config_id=config.id,
                slot_index=slot_index,
                label=f"S{slot_index}",
                reward_type="POINT",
                reward_amount=10,
                weight=(1 if slot_index == 0 else 0),
                is_jackpot=False,
            )
        )
    db.add_all(segments)
    db.commit()
    db.refresh(config)
    return config


def _seed_invalid_roulette_config_zero_weight(db) -> V2RouletteConfig:
    config = V2RouletteConfig(
        name="INVALID_ROULETTE",
        ticket_type="ROULETTE_TICKET",
        is_active=True,
        max_daily_spins=0,
        grade="COMMON",
    )
    db.add(config)
    db.flush()

    # 6 segments but all weights 0 => validation fails in V2GameConfigService
    segments = [
        V2RouletteSegment(
            config_id=config.id,
            slot_index=i,
            label=f"Z{i}",
            reward_type="POINT",
            reward_amount=1,
            weight=0,
            is_jackpot=False,
        )
        for i in range(6)
    ]
    db.add_all(segments)
    db.commit()
    db.refresh(config)
    return config


def _seed_valid_lottery_config(db, *, stock: int = 2) -> tuple[V2LotteryConfig, V2LotteryPrize]:
    config = V2LotteryConfig(
        name="TEST_LOTTERY",
        ticket_type="LOTTERY_TICKET",
        is_active=True,
        max_daily_tickets=0,
        puzzle_piece_probability=0.0,
    )
    db.add(config)
    db.flush()

    prize = V2LotteryPrize(
        config_id=config.id,
        label="P1",
        reward_type="POINT",
        reward_amount=5,
        weight=1,
        stock=int(stock),
        is_active=True,
    )
    db.add(prize)
    db.commit()
    db.refresh(config)
    db.refresh(prize)
    return config, prize


def _seed_invalid_lottery_config_zero_weight(db) -> V2LotteryConfig:
    config = V2LotteryConfig(
        name="INVALID_LOTTERY",
        ticket_type="LOTTERY_TICKET",
        is_active=True,
        max_daily_tickets=0,
        puzzle_piece_probability=0.0,
    )
    db.add(config)
    db.flush()

    prize = V2LotteryPrize(
        config_id=config.id,
        label="ZP",
        reward_type="POINT",
        reward_amount=1,
        weight=0,  # invalid: active_weight <= 0
        stock=10,
        is_active=True,
    )
    db.add(prize)
    db.commit()
    db.refresh(config)
    return config


def test_roulette_get_status_unconfigured_when_no_config(db):
    user = _create_v2_user(db, user_id=1)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.ROULETTE_TICKET, balance=0)

    svc = V2RouletteGameService()
    status = svc.get_status(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))

    assert status.config_id == 0
    assert status.name == "UNCONFIGURED"
    assert status.segments == []


def test_roulette_get_status_fallback_on_invalid_config(db):
    user = _create_v2_user(db, user_id=2)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.ROULETTE_TICKET, balance=0)

    config = _seed_invalid_roulette_config_zero_weight(db)

    svc = V2RouletteGameService()
    status = svc.get_status(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))

    assert status.config_id == config.id
    assert len(status.segments) == 6


def test_roulette_play_happy_path_creates_log_and_consumes_ticket(db):
    user = _create_v2_user(db, user_id=3)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.ROULETTE_TICKET, balance=1)
    config = _seed_valid_roulette_config(db, max_daily_spins=0)

    svc = V2RouletteGameService()
    res = svc.play(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))

    assert res.result == "OK"
    assert res.segment is not None

    log_count = db.query(V2RouletteLog).filter(V2RouletteLog.user_id == user.id, V2RouletteLog.config_id == config.id).count()
    assert log_count == 1

    wallet = db.query(UserGameWallet).filter(UserGameWallet.user_id == user.id, UserGameWallet.token_type == GameTokenType.ROULETTE_TICKET).one()
    assert int(wallet.balance) == 0


def test_roulette_play_daily_limit_reached_raises(db):
    user = _create_v2_user(db, user_id=4)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.ROULETTE_TICKET, balance=1)
    config = _seed_valid_roulette_config(db, max_daily_spins=1)

    # 이미 오늘 1회 플레이한 로그를 미리 넣어 제한 초과를 유도
    segment = (
        db.query(V2RouletteSegment)
        .filter(V2RouletteSegment.config_id == config.id)
        .order_by(V2RouletteSegment.slot_index.asc())
        .first()
    )
    assert segment is not None

    db.add(
        V2RouletteLog(
            user_id=user.id,
            config_id=config.id,
            segment_id=segment.id,
            reward_type="POINT",
            reward_amount=1,
            created_at=datetime(2026, 2, 6, 3, 0, 0),
        )
    )
    db.commit()

    svc = V2RouletteGameService()
    with pytest.raises(DailyLimitReachedError):
        svc.play(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))


def test_lottery_get_status_handles_invalid_config(db):
    user = _create_v2_user(db, user_id=5)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.LOTTERY_TICKET, balance=0)
    config = _seed_invalid_lottery_config_zero_weight(db)

    svc = V2LotteryGameService()
    status = svc.get_status(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))

    assert status.config_id == config.id
    assert status.prize_preview == []


def test_lottery_play_consumes_ticket_and_decrements_stock(db):
    user = _create_v2_user(db, user_id=6)
    _seed_wallet(db, user_id=user.id, token_type=GameTokenType.LOTTERY_TICKET, balance=1)
    config, prize = _seed_valid_lottery_config(db, stock=2)

    svc = V2LotteryGameService()
    res = svc.play(db, user_id=user.id, now=datetime(2026, 2, 6, 12, 0, tzinfo=_KST))

    assert res.result == "OK"
    assert res.prize is not None

    log_count = db.query(V2LotteryLog).filter(V2LotteryLog.user_id == user.id, V2LotteryLog.config_id == config.id).count()
    assert log_count == 1

    db.refresh(prize)
    assert int(prize.stock or 0) == 1

    wallet = db.query(UserGameWallet).filter(UserGameWallet.user_id == user.id, UserGameWallet.token_type == GameTokenType.LOTTERY_TICKET).one()
    assert int(wallet.balance) == 0
