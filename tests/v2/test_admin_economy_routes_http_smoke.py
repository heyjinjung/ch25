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
