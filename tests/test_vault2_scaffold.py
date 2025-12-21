from datetime import datetime, timedelta

from app.services.vault2_service import Vault2Service


def test_vault2_compute_expires_at_simple():
    svc = Vault2Service()
    locked_at = datetime(2025, 12, 21, 0, 0, 0)
    assert svc.compute_expires_at(locked_at, 24) == locked_at + timedelta(hours=24)


def test_vault2_endpoints_exist_and_empty(client):
    programs = client.get("/api/vault/programs")
    assert programs.status_code == 200
    assert programs.json() == []

    top = client.get("/api/vault/top")
    assert top.status_code == 200
    assert top.json() == []
