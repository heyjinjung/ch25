"""Tests for RewardService point (cash) grants."""

from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.services.reward_service import RewardService


def test_grant_point_updates_cash_balance_and_creates_ledger(session_factory):
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
    db = session_factory()
    user = User(external_id="u2")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.deliver(db, user_id=user.id, reward_type="POINT", reward_amount=50, meta={"reason": "dice_play"})

    updated = db.query(User).filter(User.id == user.id).one()
    assert updated.cash_balance == 50

    ledgers = db.query(UserCashLedger).filter(UserCashLedger.user_id == user.id).all()
    assert len(ledgers) == 1
    assert ledgers[0].delta == 50
    assert ledgers[0].reason == "dice_play"
