"""Tests for RewardService point (cash) grants."""

import os

from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.services.reward_service import RewardService
from app.core.config import get_settings


def test_grant_point_updates_cash_balance_and_creates_ledger(session_factory):
    os.environ["XP_FROM_GAME_REWARD"] = "false"
    get_settings.cache_clear()

    db = session_factory()
    user = User(external_id="u1")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.grant_point(db, user_id=user.id, amount=123, reason="TEST_REASON")

    updated = db.query(User).filter(User.id == user.id).one()
    assert updated.cash_balance == 123

    ledgers = db.query(UserCashLedger).filter(UserCashLedger.user_id == user.id).all()
    assert len(ledgers) == 1
    assert ledgers[0].delta == 123
    assert ledgers[0].balance_after == 123
    assert ledgers[0].reason == "TEST_REASON"


def test_deliver_point_routes_to_grant_point(session_factory):
    os.environ["XP_FROM_GAME_REWARD"] = "false"
    get_settings.cache_clear()

    db = session_factory()
    user = User(external_id="u2")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.deliver(db, user_id=user.id, reward_type="POINT", reward_amount=50, meta={"reason": "dice_play"})

    updated = db.query(User).filter(User.id == user.id).one()
    # 정책: 게임 보상 POINT는 cash_balance로 적립하지 않는다.
    # (환경설정 xp_from_game_reward가 True일 때만 XP로 전환될 수 있음)
    assert updated.cash_balance == 0

    ledgers = db.query(UserCashLedger).filter(UserCashLedger.user_id == user.id).all()
    assert len(ledgers) == 0


def test_deliver_point_season_pass_routes_to_vault_locked(session_factory):
    os.environ["XP_FROM_GAME_REWARD"] = "false"
    get_settings.cache_clear()

    db = session_factory()
    user = User(external_id="u3")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.deliver(
        db,
        user_id=user.id,
        reward_type="POINT",
        reward_amount=50,
        meta={"source": "SEASON_PASS_TEST", "reason": "SEASON_PASS_REWARD"},
    )

    updated = db.query(User).filter(User.id == user.id).one()
    assert updated.vault_locked_balance == 50
    assert updated.cash_balance == 0

    ledgers = db.query(UserCashLedger).filter(UserCashLedger.user_id == user.id).all()
    assert len(ledgers) == 0
