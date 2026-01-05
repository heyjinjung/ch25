from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id
from app.models.user import User


def test_telegram_unlink_approve_clears_owner_telegram_id(client: TestClient, session_factory):
    db = session_factory()

    owner = User(id=1, external_id="owner", nickname="owner", telegram_id=111, telegram_username="owner_tg")
    requester = User(id=2, external_id="req", nickname="req")
    db.add_all([owner, requester])
    db.commit()

    # Submit unlink request as requester (user_id=2)
    client.app.dependency_overrides[get_current_user_id] = lambda: 2
    resp = client.post(
        "/api/telegram/unlink-request",
        json={"telegram_id": "111", "reason": "test", "evidence": None},
    )
    assert resp.status_code == 200, resp.text
    request_id = resp.json()["id"]

    # Process as admin (get_current_admin_id is already overridden to 1 by fixture)
    resp2 = client.post(
        f"/api/admin/telegram/unlink-requests/{request_id}/process",
        json={"action": "APPROVE", "admin_memo": "ok"},
    )
    assert resp2.status_code == 200, resp2.text

    db.expire_all()
    owner2 = db.get(User, 1)
    assert owner2 is not None
    assert owner2.telegram_id is None
    assert owner2.telegram_username is None


def test_telegram_unlink_rejects_invalid_telegram_id(client: TestClient):
    # Submit unlink request with non-numeric telegram_id
    client.app.dependency_overrides[get_current_user_id] = lambda: 2
    resp = client.post(
        "/api/telegram/unlink-request",
        json={"telegram_id": "not-a-number", "reason": "test", "evidence": None},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "INVALID_TELEGRAM_ID"
