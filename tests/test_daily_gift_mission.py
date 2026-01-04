from fastapi.testclient import TestClient

from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.user import User


def test_daily_gift_completes_on_login_and_can_be_claimed(client: TestClient, session_factory) -> None:
    db = session_factory()

    # Seed user used by dependency override (get_current_user_id -> 1)
    user = User(id=1, external_id="u1", nickname="tester")
    db.add(user)

    # Seed the Daily Gift mission as described in ops doc
    mission = Mission(
        title="매일 선물 (Daily Gift)",
        description="매일 접속만 해도 다이아 10개를 드립니다.",
        category=MissionCategory.DAILY,
        logic_key="daily_login_gift",
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    # Simulate login (auth token issuance) which increments LOGIN missions once per KST day
    resp = client.post("/api/auth/token", json={"external_id": "u1"})
    assert resp.status_code == 200

    # Verify mission appears as completed but unclaimed
    missions_resp = client.get("/api/mission/")
    assert missions_resp.status_code == 200
    payload = missions_resp.json()
    missions = payload["missions"]

    daily_gift = next((m for m in missions if m["mission"]["logic_key"] == "daily_login_gift"), None)
    assert daily_gift is not None
    assert daily_gift["progress"]["is_completed"] is True
    assert daily_gift["progress"]["is_claimed"] is False

    # Claim reward
    claim_resp = client.post(
        f"/api/mission/{mission.id}/claim",
        headers={"X-Idempotency-Key": "daily-gift-claim-1"},
    )
    assert claim_resp.status_code == 200
    assert claim_resp.json()["success"] is True
    assert claim_resp.json()["reward_type"] == "DIAMOND"
    assert claim_resp.json()["amount"] == 10

    # Ensure it is now claimed
    missions_resp2 = client.get("/api/mission/")
    assert missions_resp2.status_code == 200
    payload2 = missions_resp2.json()
    missions2 = payload2["missions"]
    daily_gift2 = next((m for m in missions2 if m["mission"]["logic_key"] == "daily_login_gift"), None)
    assert daily_gift2 is not None
    assert daily_gift2["progress"]["is_completed"] is True
    assert daily_gift2["progress"]["is_claimed"] is True
