"""Phase 2 audit coverage: admin endpoints and economy stats.

Covers:
- Admin Vault state inspection and identifier lookup
- Admin game tokens grant/revoke + ledger listing
- Economy stats endpoint (inventory ledger + idempotency)
"""
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.inventory import UserInventoryLedger
from app.models.idempotency import UserIdempotencyKey
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_cash_ledger import UserCashLedger
from app.services.vault_service import VaultService
from app.services.vault2_service import Vault2Service
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService


def _seed_user(session: Session, user_id: int, external_id: str | None = None) -> User:
    user = User(
        id=user_id,
        external_id=external_id or f"ext{user_id}",
        nickname=f"user{user_id}",
        status="ACTIVE",
        vault_locked_balance=0,
        vault_balance=0,
        cash_balance=0,
    )
    session.add(user)
    session.commit()
    return user


def test_admin_vault_state_by_id_and_identifier(session_factory, client: TestClient) -> None:
    session: Session = session_factory()
    user = _seed_user(session, user_id=1, external_id="ext1")
    user.vault_locked_balance = 100
    session.commit()

    resp = client.get("/admin/api/vault/1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == 1
    assert body["locked_balance"] == 100
    assert body["available_balance"] == 100

    resp2 = client.get("/admin/api/vault/by-identifier/ext1")
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["user_id"] == 1
    assert body2["locked_balance"] == 100


def test_admin_game_tokens_grant_revoke_and_ledger(session_factory, client: TestClient) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=2, external_id="ext2")

    grant = client.post(
        "/admin/api/game-tokens/grant",
        json={"user_id": 2, "token_type": GameTokenType.DICE_TOKEN.value, "amount": 5},
    )
    assert grant.status_code == 200
    balance_after_grant = grant.json()["balance"]
    assert balance_after_grant >= 5

    revoke = client.post(
        "/admin/api/game-tokens/revoke",
        json={"user_id": 2, "token_type": GameTokenType.DICE_TOKEN.value, "amount": 2},
    )
    assert revoke.status_code == 200
    balance_after_revoke = revoke.json()["balance"]
    assert balance_after_revoke == balance_after_grant - 2

    ledger = client.get("/admin/api/game-tokens/ledger", params={"user_id": 2})
    assert ledger.status_code == 200
    rows = ledger.json()
    assert any(entry["user_id"] == 2 for entry in rows)


def test_admin_economy_stats_from_inventory_and_idempotency(session_factory, client: TestClient) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=3, external_id="ext3")

    session.add(
        UserInventoryLedger(
            user_id=3,
            item_type="VOUCHER",
            change_amount=-50,
            balance_after=-50,
            reason="USE_VOUCHER",
            related_id="test_voucher",
        )
    )
    session.add(
        UserInventoryLedger(
            user_id=3,
            item_type="COIN",
            change_amount=100,
            balance_after=100,
            reason="SHOP_PURCHASE:sku1",
            related_id="test_shop",
        )
    )
    now = datetime.utcnow()
    session.add_all(
        [
            UserIdempotencyKey(
                user_id=3,
                scope="PURCHASE",
                idempotency_key="k1",
                request_hash="h1",
                request_json="{}",
                status="COMPLETED",
                response_json="{}",
                created_at=now,
            ),
            UserIdempotencyKey(
                user_id=3,
                scope="PURCHASE",
                idempotency_key="k2",
                request_hash="h2",
                request_json="{}",
                status="FAILED",
                response_json="{}",
                created_at=now + timedelta(seconds=1),
            ),
        ]
    )
    session.commit()

    resp = client.get("/admin/api/economy/stats")
    assert resp.status_code == 200
    data = resp.json()

    assert any(entry["reason"].startswith("SHOP_PURCHASE") for entry in data.get("shop_purchases", []))
    assert any(entry["item_type"] == "VOUCHER" for entry in data.get("voucher_uses", []))
    assert any(entry.get("scope") == "PURCHASE" for entry in data.get("idempotency", []))


def test_admin_vault_timer_actions(session_factory, client: TestClient) -> None:
    session: Session = session_factory()
    user = _seed_user(session, user_id=4, external_id="ext4")
    user.vault_locked_balance = 1000
    session.commit()

    start_resp = client.post(f"/admin/api/vault/{user.id}/timer", json={"action": "start_now"})
    assert start_resp.status_code == 200
    body = start_resp.json()
    assert body["locked_balance"] == 1000
    assert body.get("locked_expires_at") is not None

    expire_resp = client.post(f"/admin/api/vault/{user.id}/timer", json={"action": "expire_now"})
    assert expire_resp.status_code == 200
    body2 = expire_resp.json()
    assert body2["locked_balance"] == 0
    assert body2.get("locked_expires_at") is None


def test_admin_vault2_tick_transitions(session_factory, client: TestClient) -> None:
    session: Session = session_factory()
    svc = Vault2Service()
    program = svc._ensure_default_program(session)
    status = svc.get_or_create_status(session, user_id=5, program=program)
    now = datetime.utcnow()
    status.state = "LOCKED"
    status.locked_amount = 500
    status.available_amount = 0
    status.expires_at = now - timedelta(minutes=1)
    session.add(status)
    session.commit()

    resp = client.post("/admin/api/vault2/tick")
    assert resp.status_code == 200
    session.refresh(status)
    assert status.state == "AVAILABLE"
    assert status.locked_amount == 0
    assert status.available_amount == 500


def test_user_game_play_accrual_records_vault_and_ledger(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=10, external_id="ext10")

    service = VaultService()
    added = service.record_game_play_earn_event(
        session,
        user_id=10,
        game_type="DICE",
        game_log_id=101,
        token_type=GameTokenType.DICE_TOKEN.value,
        outcome="WIN",
        payout_raw={"reward_amount": 200},
    )

    session.expire_all()
    user = session.get(User, 10)
    assert added > 0
    assert user is not None
    assert user.vault_locked_balance == added

    # Earn event and ledger entry should exist for audit trail.
    assert session.query(VaultEarnEvent).filter_by(user_id=10, earn_event_id="GAME:DICE:101").one_or_none()
    ledger = (
        session.query(UserCashLedger)
        .filter(UserCashLedger.user_id == 10, UserCashLedger.reason == "VAULT_ACCRUAL")
        .order_by(UserCashLedger.id.desc())
        .first()
    )
    assert ledger is not None
    assert ledger.delta == added


def test_user_vault_unlock_policy_is_disabled_phase3(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=11, external_id="ext11")
    user = session.get(User, 11)
    user.vault_locked_balance = 5000
    user.cash_balance = 0
    session.commit()

    service = VaultService()
    # Phase3: expire_now only zeroes locked; no cash transfer occurs.
    service.admin_timer_action(session, user_id=11, action="expire_now")

    session.expire_all()
    user_after = session.get(User, 11)
    assert user_after is not None
    assert user_after.vault_locked_balance == 0
    assert user_after.cash_balance == 0  # unlock-to-cash path is disabled


def test_user_token_consume_updates_wallet_and_ledger(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=12, external_id="ext12")

    wallet_service = GameWalletService()
    wallet_service.grant_tokens(session, user_id=12, token_type=GameTokenType.ROULETTE_COIN, amount=3)
    balance_after, consumed_trial = wallet_service.require_and_consume_token(
        session,
        user_id=12,
        token_type=GameTokenType.ROULETTE_COIN,
        amount=2,
    )

    session.expire_all()
    wallet = session.query(UserGameWallet).filter_by(user_id=12, token_type=GameTokenType.ROULETTE_COIN).one()
    assert balance_after == 1
    assert wallet.balance == 1
    assert consumed_trial is False
    ledger = (
        session.query(UserGameWalletLedger)
        .filter(UserGameWalletLedger.user_id == 12, UserGameWalletLedger.token_type == GameTokenType.ROULETTE_COIN)
        .order_by(UserGameWalletLedger.id.desc())
        .first()
    )
    assert ledger is not None
    assert ledger.delta == -2


def test_user_vault_expiry_disabled_phase3(session_factory) -> None:
    session: Session = session_factory()
    user = _seed_user(session, user_id=13, external_id="ext13")
    user.vault_locked_balance = 3000
    user.vault_locked_expires_at = datetime.utcnow() - timedelta(days=1)
    session.commit()

    # Internal expiry helper returns False and does not mutate.
    expired = VaultService._expire_locked_if_due(user, datetime.utcnow())
    session.refresh(user)
    assert expired is False
    assert user.vault_locked_balance == 3000


def test_int_wallet_balance_matches_ledger_sum(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=14, external_id="ext14")

    wallet_service = GameWalletService()
    wallet_service.grant_tokens(session, user_id=14, token_type=GameTokenType.DICE_TOKEN, amount=5)
    wallet_service.revoke_tokens(session, user_id=14, token_type=GameTokenType.DICE_TOKEN, amount=2)

    session.expire_all()
    wallet = session.query(UserGameWallet).filter_by(user_id=14, token_type=GameTokenType.DICE_TOKEN).one()
    ledger_sum = (
        session.query(func.coalesce(func.sum(UserGameWalletLedger.delta), 0))
        .filter(UserGameWalletLedger.user_id == 14, UserGameWalletLedger.token_type == GameTokenType.DICE_TOKEN)
        .scalar()
    )
    assert wallet.balance == ledger_sum


def test_int_vault_balance_matches_earn_sum(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=15, external_id="ext15")

    service = VaultService()
    service.record_game_play_earn_event(
        session,
        user_id=15,
        game_type="ROULETTE",
        game_log_id=201,
        token_type=GameTokenType.ROULETTE_COIN.value,
        payout_raw={"reward_type": "POINT", "reward_amount": 200},
    )
    service.record_game_play_earn_event(
        session,
        user_id=15,
        game_type="ROULETTE",
        game_log_id=202,
        token_type=GameTokenType.ROULETTE_COIN.value,
        payout_raw={"reward_type": "POINT", "reward_amount": 200},
    )

    session.expire_all()
    user = session.get(User, 15)
    total_earn = (
        session.query(func.coalesce(func.sum(VaultEarnEvent.amount), 0))
        .filter(VaultEarnEvent.user_id == 15)
        .scalar()
    )
    assert user is not None
    assert user.vault_locked_balance == total_earn


def test_int_cash_balance_matches_cash_ledger_sum(session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session, user_id=16, external_id="ext16")

    reward_service = RewardService()
    reward_service.grant_point(session, user_id=16, amount=1000, reason="TEST_GRANT", commit=True)
    reward_service.grant_point(session, user_id=16, amount=500, reason="TEST_GRANT", commit=True)

    session.expire_all()
    user = session.get(User, 16)
    ledger_sum = session.query(func.coalesce(func.sum(UserCashLedger.delta), 0)).filter(UserCashLedger.user_id == 16).scalar()
    assert user is not None
    assert user.cash_balance == ledger_sum
