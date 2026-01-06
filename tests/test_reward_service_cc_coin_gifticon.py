"""Tests for RewardService CC_COIN/CC_COIN_GIFTICON inventory pending grants."""

from app.models.user import User
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.services.reward_service import RewardService


def test_deliver_cc_coin_grants_cc_coin_gifticon_inventory_item(session_factory):
    db = session_factory()
    user = User(external_id="cc1")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.deliver(db, user_id=user.id, reward_type="CC_COIN", reward_amount=999, meta={"reason": "TEST"})

    item = (
        db.query(UserInventoryItem)
        .filter(UserInventoryItem.user_id == user.id, UserInventoryItem.item_type == "CC_COIN_GIFTICON")
        .one_or_none()
    )
    assert item is not None
    assert item.quantity == 1

    ledgers = (
        db.query(UserInventoryLedger)
        .filter(UserInventoryLedger.user_id == user.id, UserInventoryLedger.item_type == "CC_COIN_GIFTICON")
        .all()
    )
    assert len(ledgers) == 1
    assert ledgers[0].change_amount == 1
    assert ledgers[0].balance_after == 1


def test_deliver_cc_coin_gifticon_grants_cc_coin_gifticon_inventory_item(session_factory):
    db = session_factory()
    user = User(external_id="cc2")
    db.add(user)
    db.commit()
    db.refresh(user)

    svc = RewardService()
    svc.deliver(db, user_id=user.id, reward_type="CC_COIN_GIFTICON", reward_amount=1, meta={"reason": "TEST"})

    item = (
        db.query(UserInventoryItem)
        .filter(UserInventoryItem.user_id == user.id, UserInventoryItem.item_type == "CC_COIN_GIFTICON")
        .one_or_none()
    )
    assert item is not None
    assert item.quantity == 1

    ledgers = (
        db.query(UserInventoryLedger)
        .filter(UserInventoryLedger.user_id == user.id, UserInventoryLedger.item_type == "CC_COIN_GIFTICON")
        .all()
    )
    assert len(ledgers) == 1
    assert ledgers[0].change_amount == 1
    assert ledgers[0].balance_after == 1
