"""
Test: Admin Economy Routes (HTTP smoke)
목표: economy_routes.py에서 ROI 큰 엔드포인트를 실제 HTTP 호출로 커버

- /admin/economy/transaction-types
- /admin/economy/circuit-breaker/*

fixtures: test_client, admin_token, user_token
"""

from __future__ import annotations


def test_admin_economy_transaction_types_guard_and_shape(test_client, admin_token, user_token):
    url = "/api/v2/admin/economy/transaction-types"

    # 1) No auth -> 401
    res = test_client.get(url)
    assert res.status_code == 401

    # 2) User role -> 403
    res2 = test_client.get(url, headers={"Authorization": f"Bearer {user_token}"})
    assert res2.status_code == 403

    # 3) Admin role -> 200
    res3 = test_client.get(url, headers={"Authorization": f"Bearer {admin_token}"})
    assert res3.status_code == 200

    data = res3.json()
    assert isinstance(data, list)
    assert any(item.get("value") == "VAULT" for item in data)
    assert all("value" in item and "label" in item and "group" in item for item in data)


def test_admin_economy_circuit_breaker_status_smoke(monkeypatch, test_client, admin_token):
    from app.v2.services.admin_economy_service import V2AdminEconomyService

    def _fake_status(db):
        return []

    monkeypatch.setattr(V2AdminEconomyService, "get_circuit_breaker_status", _fake_status)

    res = test_client.get(
        "/api/v2/admin/economy/circuit-breaker/status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json() == []


def test_admin_economy_circuit_breaker_mutations_smoke(monkeypatch, test_client, admin_token):
    from app.v2.services.admin_economy_service import V2AdminEconomyService
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    called = {"reset": 0, "set_config": 0}

    def _fake_reset(db, asset_type: str, limit_type: str, user_id=None):
        called["reset"] += 1

    def _fake_set_config(db, asset_type: str, global_limit=None, user_limit=None):
        called["set_config"] += 1

    monkeypatch.setattr(V2AdminEconomyService, "reset_circuit_breaker", _fake_reset)
    monkeypatch.setattr(CircuitBreakerService, "set_config", _fake_set_config)

    res = test_client.post(
        "/api/v2/admin/economy/circuit-breaker/reset",
        json={"asset_type": "VAULT", "limit_type": "GLOBAL", "user_id": None},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json().get("success") is True

    res2 = test_client.put(
        "/api/v2/admin/economy/circuit-breaker/limits",
        json={"asset_type": "VAULT", "global_limit": 1234, "user_limit": 55},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res2.status_code == 200
    assert res2.json().get("success") is True

    assert called["reset"] == 1
    assert called["set_config"] == 1


def test_admin_economy_deposit_log_crud_smoke(monkeypatch, test_client, admin_token, base_user):
    from app.v2.api.admin import economy_routes

    monkeypatch.setattr(economy_routes, "_sync_cumulative_deposit", lambda db, user_id: None)
    monkeypatch.setattr(economy_routes.V2AdminAuditService, "log", lambda *args, **kwargs: None)

    res = test_client.post(
        "/api/v2/admin/economy/deposits",
        json={"user_id": int(base_user.id), "amount": 123},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    created = res.json()
    assert created["userId"] == int(base_user.id)
    assert created["amount"] == 123
    assert created.get("kstDate")

    log_id = int(created["id"])

    res2 = test_client.put(
        f"/api/v2/admin/economy/deposits/{log_id}",
        json={"amount": 50, "kst_date": "2026-02-12"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res2.status_code == 200
    updated = res2.json()
    assert updated["id"] == log_id
    assert updated["amount"] == 50
    assert updated["kstDate"] == "2026-02-12"

    res3 = test_client.delete(
        f"/api/v2/admin/economy/deposits/{log_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res3.status_code == 200
    assert res3.json().get("success") is True


def test_admin_withdrawals_status_and_risk_mapping(test_client, admin_token, db, base_user):
    from datetime import datetime, timedelta

    from app.v2.models.core.vault_withdrawal_request import VaultWithdrawalRequest

    now = datetime.utcnow()

    pending_low = VaultWithdrawalRequest(
        user_id=int(base_user.id),
        amount=100,
        status="PENDING",
        created_at=now - timedelta(seconds=1),
        updated_at=now - timedelta(seconds=1),
    )
    pending_high = VaultWithdrawalRequest(
        user_id=int(base_user.id),
        amount=1_000_000,
        status="PENDING",
        created_at=now,
        updated_at=now,
    )
    cancelled = VaultWithdrawalRequest(
        user_id=int(base_user.id),
        amount=300_000,
        status="CANCELLED",
        created_at=now,
        updated_at=now,
    )

    db.add_all([pending_low, pending_high, cancelled])
    db.commit()

    res = test_client.get(
        "/api/v2/admin/withdrawals?status=PENDING",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    risk_by_amount = {item["amount"]: item["riskLevel"] for item in data}
    assert risk_by_amount[100] == "LOW"
    assert risk_by_amount[1_000_000] == "HIGH"

    res2 = test_client.get(
        "/api/v2/admin/withdrawals?status=CANCELLED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) == 1
    assert data2[0]["status"] == "REJECTED"


def test_admin_economy_deposit_logs_list_smoke(test_client, admin_token, db, base_user):
    from datetime import date, datetime

    from app.v2.models.core.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta

    row = ExternalRankingDailyDepositDelta(
        user_id=int(base_user.id),
        kst_date=date(2026, 2, 12),
        deposit_delta=10,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()

    res = test_client.get(
        "/api/v2/admin/economy/deposits?page=1&limit=50",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any(item.get("userId") == int(base_user.id) for item in data)

    res2 = test_client.get(
        f"/api/v2/admin/economy/deposits?search={base_user.nickname}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert isinstance(data2, list)
    assert any(item.get("userId") == int(base_user.id) for item in data2)
