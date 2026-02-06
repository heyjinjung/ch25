import pytest
from sqlalchemy.exc import IntegrityError

from app.v2.models.user import V2User
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_segment_rule import V2SegmentRule
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.models.v2_ticket_conversion_policy import V2TicketConversionPolicy
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog
from app.v2.models.v2_user_segment import V2UserSegment


def _add_user(db, *, cc_id: str, telegram_id: int | None = None) -> V2User:
    user = V2User(
        cc_id=cc_id,
        telegram_id=telegram_id,
        vault_locked_balance=0,
    )
    db.add(user)
    db.flush()
    return user


def test_v2_user_cc_id_unique(db):
    _add_user(db, cc_id="cc-unique-1")
    with pytest.raises(IntegrityError):
        _add_user(db, cc_id="cc-unique-1")


def test_v2_user_telegram_id_unique(db):
    _add_user(db, cc_id="cc-tg-1", telegram_id=123456)
    with pytest.raises(IntegrityError):
        _add_user(db, cc_id="cc-tg-2", telegram_id=123456)


def test_v2_user_segment_pk_user_id_unique(db):
    user = _add_user(db, cc_id="cc-seg-1")

    db.add(V2UserSegment(user_id=user.id, segment="COMMON"))
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(V2UserSegment(user_id=user.id, segment="VIP"))
        db.flush()


def test_v2_segment_rule_name_unique(db):
    db.add(
        V2SegmentRule(
            name="rule-1",
            segment="COMMON",
            priority=10,
            enabled=True,
            condition_json={"op": "always"},
        )
    )
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2SegmentRule(
                name="rule-1",
                segment="VIP",
                priority=20,
                enabled=True,
                condition_json={"op": "always"},
            )
        )
        db.flush()


def test_v2_roulette_segment_unique_slot_per_config(db):
    cfg = V2RouletteConfig(name="roulette-1", ticket_type="ROULETTE_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    db.add(
        V2RouletteSegment(
            config_id=cfg.id,
            slot_index=0,
            label="A",
            reward_type="VAULT",
            reward_amount=1,
            weight=1,
            is_jackpot=False,
        )
    )
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2RouletteSegment(
                config_id=cfg.id,
                slot_index=0,
                label="B",
                reward_type="VAULT",
                reward_amount=1,
                weight=1,
                is_jackpot=False,
            )
        )
        db.flush()


@pytest.mark.parametrize("bad_slot", [-1, 8])
def test_v2_roulette_segment_slot_index_check_range(db, bad_slot: int):
    cfg = V2RouletteConfig(name="roulette-range", ticket_type="ROULETTE_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2RouletteSegment(
                config_id=cfg.id,
                slot_index=bad_slot,
                label="X",
                reward_type="VAULT",
                reward_amount=1,
                weight=1,
                is_jackpot=False,
            )
        )
        db.flush()


def test_v2_roulette_segment_weight_non_negative_check(db):
    cfg = V2RouletteConfig(name="roulette-weight", ticket_type="ROULETTE_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2RouletteSegment(
                config_id=cfg.id,
                slot_index=1,
                label="W",
                reward_type="VAULT",
                reward_amount=1,
                weight=-1,
                is_jackpot=False,
            )
        )
        db.flush()


def test_v2_lottery_prize_unique_label_per_config(db):
    cfg = V2LotteryConfig(name="lottery-1", ticket_type="LOTTERY_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    db.add(
        V2LotteryPrize(
            config_id=cfg.id,
            label="P1",
            reward_type="VAULT",
            reward_amount=1,
            weight=1,
            stock=None,
            is_active=True,
        )
    )
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2LotteryPrize(
                config_id=cfg.id,
                label="P1",
                reward_type="VAULT",
                reward_amount=1,
                weight=1,
                stock=None,
                is_active=True,
            )
        )
        db.flush()


def test_v2_lottery_prize_weight_non_negative_check(db):
    cfg = V2LotteryConfig(name="lottery-weight", ticket_type="LOTTERY_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2LotteryPrize(
                config_id=cfg.id,
                label="P",
                reward_type="VAULT",
                reward_amount=1,
                weight=-1,
                stock=None,
                is_active=True,
            )
        )
        db.flush()


def test_v2_lottery_prize_stock_non_negative_check(db):
    cfg = V2LotteryConfig(name="lottery-stock", ticket_type="LOTTERY_TICKET", is_active=True)
    db.add(cfg)
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            V2LotteryPrize(
                config_id=cfg.id,
                label="P",
                reward_type="VAULT",
                reward_amount=1,
                weight=1,
                stock=-1,
                is_active=True,
            )
        )
        db.flush()


def test_v2_ops_execution_result_persists_payload_json(db):
    row = V2OpsExecutionResult(
        task_id=1,
        kind="TEST",
        payload_json={"ok": True, "count": 1},
    )
    db.add(row)
    db.flush()

    got = db.get(V2OpsExecutionResult, row.id)
    assert got is not None
    assert got.payload_json["ok"] is True
    assert got.payload_json["count"] == 1


def test_v2_shop_order_persists_cost_and_reward(db):
    row = V2ShopOrder(
        user_id=1,
        sku="SKU-1",
        name="Test Item",
        cost_type="VAULT",
        cost_amount=10,
        reward_type="TICKET",
        reward_amount=1,
    )
    db.add(row)
    db.flush()

    got = db.get(V2ShopOrder, row.id)
    assert got is not None
    assert got.cost_type == "VAULT"
    assert got.cost_amount == 10


def test_v2_ticket_conversion_policy_defaults_to_one_to_one(db):
    row = V2TicketConversionPolicy(target_ticket_type="DICE_TICKET")
    db.add(row)
    db.flush()

    got = db.get(V2TicketConversionPolicy, row.id)
    assert got is not None
    assert got.ratio_numerator == 1
    assert got.ratio_denominator == 1
    assert got.is_active is True


def test_v2_ticket_zero_log_defaults_reason_and_amount(db):
    row = V2TicketZeroLog(user_id=1, ticket_type="DICE_TICKET")
    db.add(row)
    db.flush()

    got = db.get(V2TicketZeroLog, row.id)
    assert got is not None
    assert got.ticket_amount == 1
    assert got.reason == "BAILOUT_GRANT"
