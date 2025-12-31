"""Integration tests for admin mission CRUD APIs."""

from fastapi.testclient import TestClient


def test_admin_mission_list_empty(client: TestClient) -> None:
    resp = client.get("/api/admin-mission/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_admin_mission_create_and_list(client: TestClient) -> None:
    payload = {
        "title": "Test Mission",
        "description": "Do something",
        "category": "DAILY",
        "logic_key": "test_mission_1",
        "action_type": "PLAY_GAME",
        "target_value": 3,
        "reward_type": "DIAMOND",
        "reward_amount": 10,
        "xp_reward": 0,
        "requires_approval": False,
        "is_active": True,
    }

    create_resp = client.post("/api/admin-mission/", json=payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["logic_key"] == "test_mission_1"
    assert created["requires_approval"] is False

    list_resp = client.get("/api/admin-mission/")
    assert list_resp.status_code == 200
    missions = list_resp.json()
    assert len(missions) == 1
    assert missions[0]["id"] == created["id"]

