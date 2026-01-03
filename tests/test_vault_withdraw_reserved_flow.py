from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient

from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User
from app.models.user_activity import UserActivity


def _seed_user_and_activity(db, *, user_id: int, locked_balance: int) -> None:
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        user = User(id=user_id, external_id=f"test-user-{user_id}")
    user.vault_locked_balance = locked_balance
    user.vault_balance = locked_balance  # legacy mirror
    db.add(user)

    activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).one_or_none()
    if activity is None:
        activity = UserActivity(user_id=user_id)
    activity.last_charge_at = datetime.utcnow()
    db.add(activity)

    db.commit()


def test_vault_status_includes_amount_fields(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()

    assert body["vault_amount_total"] == 30_000
    assert body["vault_amount_reserved"] == 0
    assert body["vault_amount_available"] == 30_000

    assert body["available_balance"] == 30_000


def test_withdraw_request_reserves_without_deducting_total(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    res = client.post("/api/vault/withdraw", json={"amount": 10_000})
    assert res.status_code == 200

    status_res = client.get("/api/vault/status")
    assert status_res.status_code == 200
    body = status_res.json()

    assert body["vault_amount_total"] == 30_000
    assert body["vault_amount_reserved"] == 10_000
    assert body["vault_amount_available"] == 20_000


def test_withdraw_approve_deducts_total_and_clears_reserved(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 10_000}).json()
    request_id = req["request_id"]

    proc = client.post("/api/vault/admin/process", json={"request_id": request_id, "action": "APPROVE"})
    assert proc.status_code == 200

    db = session_factory()
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "User", AdminAuditLog.target_id == "1")
        .order_by(AdminAuditLog.id.desc())
        .all()
    )
    assert any(l.action == "VAULT_WITHDRAWAL_APPROVE" for l in logs)

    status_res = client.get("/api/vault/status")
    body = status_res.json()

    assert body["vault_amount_total"] == 20_000
    assert body["vault_amount_reserved"] == 0
    assert body["vault_amount_available"] == 20_000


def test_withdraw_reject_keeps_total_and_clears_reserved(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 10_000}).json()
    request_id = req["request_id"]

    proc = client.post("/api/vault/admin/process", json={"request_id": request_id, "action": "REJECT"})
    assert proc.status_code == 200

    db = session_factory()
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "User", AdminAuditLog.target_id == "1")
        .order_by(AdminAuditLog.id.desc())
        .all()
    )
    assert any(l.action == "VAULT_WITHDRAWAL_REJECT" for l in logs)

    status_res = client.get("/api/vault/status")
    body = status_res.json()

    assert body["vault_amount_total"] == 30_000
    assert body["vault_amount_reserved"] == 0
    assert body["vault_amount_available"] == 30_000


def test_admin_can_reduce_pending_withdraw_amount_updates_reserved(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 20_000}).json()
    request_id = req["request_id"]

    # Reduce from 20,000 -> 10,000
    adj = client.post("/api/vault/admin/adjust-amount", json={"request_id": request_id, "new_amount": 10_000})
    assert adj.status_code == 200

    db = session_factory()
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "User", AdminAuditLog.target_id == "1")
        .order_by(AdminAuditLog.id.desc())
        .all()
    )
    assert any(l.action == "VAULT_WITHDRAWAL_ADJUST_AMOUNT" for l in logs)

    status_res = client.get("/api/vault/status")
    assert status_res.status_code == 200
    body = status_res.json()

    assert body["vault_amount_total"] == 30_000
    assert body["vault_amount_reserved"] == 10_000
    assert body["vault_amount_available"] == 20_000


def test_admin_cannot_adjust_non_pending_withdraw_request(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 10_000}).json()
    request_id = req["request_id"]

    proc = client.post("/api/vault/admin/process", json={"request_id": request_id, "action": "REJECT"})
    assert proc.status_code == 200

    adj = client.post("/api/vault/admin/adjust-amount", json={"request_id": request_id, "new_amount": 10_000})
    assert adj.status_code == 400


def test_admin_can_cancel_pending_withdraw_request_clears_reserved(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 10_000}).json()
    request_id = req["request_id"]

    cancel = client.post("/api/vault/admin/cancel", json={"request_id": request_id})
    assert cancel.status_code == 200

    db = session_factory()
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "User", AdminAuditLog.target_id == "1")
        .order_by(AdminAuditLog.id.desc())
        .all()
    )
    assert any(l.action == "VAULT_WITHDRAWAL_CANCEL" for l in logs)

    status_res = client.get("/api/vault/status")
    assert status_res.status_code == 200
    body = status_res.json()

    assert body["vault_amount_total"] == 30_000
    assert body["vault_amount_reserved"] == 0
    assert body["vault_amount_available"] == 30_000


def test_admin_cannot_cancel_non_pending_withdraw_request(client: TestClient, session_factory):
    db = session_factory()
    _seed_user_and_activity(db, user_id=1, locked_balance=30_000)

    req = client.post("/api/vault/withdraw", json={"amount": 10_000}).json()
    request_id = req["request_id"]

    proc = client.post("/api/vault/admin/process", json={"request_id": request_id, "action": "APPROVE"})
    assert proc.status_code == 200

    cancel = client.post("/api/vault/admin/cancel", json={"request_id": request_id})
    assert cancel.status_code == 400
