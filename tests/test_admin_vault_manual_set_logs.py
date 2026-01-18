from __future__ import annotations

from fastapi.testclient import TestClient

from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_withdrawal_request import VaultWithdrawalRequest


def _seed_user(db, *, user_id: int, locked_balance: int, cash_balance: int = 0) -> None:
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        user = User(id=user_id, external_id=f"test-user-{user_id}")
    user.vault_locked_balance = locked_balance
    user.vault_balance = locked_balance
    user.cash_balance = cash_balance
    db.add(user)
    db.commit()


def test_admin_manual_set_decrease_creates_withdrawal_request(client: TestClient, session_factory):
    db = session_factory()
    _seed_user(db, user_id=1, locked_balance=50_000)

    res = client.post(
        "/admin/api/vault/1/balance",
        json={"locked_amount": 30_000, "reason": "TEST_MANUAL_SET"},
    )
    assert res.status_code == 200

    db = session_factory()
    requests = (
        db.query(VaultWithdrawalRequest)
        .filter(VaultWithdrawalRequest.user_id == 1, VaultWithdrawalRequest.status == "APPROVED")
        .all()
    )
    assert any(
        r.amount == 20_000
        and r.processed_by == 1
        and r.admin_memo
        and "TEST_MANUAL_SET" in r.admin_memo
        for r in requests
    )


def test_admin_manual_set_increase_creates_earn_event(client: TestClient, session_factory):
    db = session_factory()
    _seed_user(db, user_id=1, locked_balance=10_000)

    res = client.post(
        "/admin/api/vault/1/balance",
        json={"locked_amount": 25_000, "reason": "TEST_MANUAL_SET_PLUS"},
    )
    assert res.status_code == 200

    db = session_factory()
    events = (
        db.query(VaultEarnEvent)
        .filter(
            VaultEarnEvent.user_id == 1,
            VaultEarnEvent.earn_type == "ADMIN_ADJUST",
            VaultEarnEvent.source == "ADMIN",
        )
        .all()
    )
    assert any(
        e.amount == 15_000
        and e.reward_kind == "MANUAL_SET"
        and e.earn_event_id.startswith("ADMIN:MANUAL_SET:")
        for e in events
    )
