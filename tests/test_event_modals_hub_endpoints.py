from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.user import User


@pytest.fixture()
def seed_event_modals_hub(session_factory) -> None:
    session: Session = session_factory()

    user = session.query(User).filter(User.id == 1).one_or_none()
    if user is None:
        user = User(id=1, external_id="event-modal-user", status="ACTIVE")
    session.add(user)

    today = date.today()
    schedule = FeatureSchedule(date=today, feature_type=FeatureType.LOTTERY, is_active=True)
    feature_cfg = FeatureConfig(feature_type=FeatureType.LOTTERY, title="Lottery Day", page_path="/lottery", is_enabled=True)
    lotto_cfg = LotteryConfig(name="EVENT_MODAL_LOTTERY", is_active=True, max_daily_tickets=0)
    prize = LotteryPrize(
        config=lotto_cfg,
        label="P1",
        reward_type="POINT",
        reward_amount=5,
        weight=1,
        stock=10,
        is_active=True,
    )
    session.add_all([schedule, feature_cfg, lotto_cfg, prize])

    message = AdminMessage(
        sender_admin_id=0,
        title="Event Notice",
        content="Event body",
        is_deleted=False,
        target_type="ALL",
        target_value=None,
        channels=["INBOX"],
        recipient_count=1,
        read_count=0,
    )
    session.add(message)
    session.flush()
    session.add(AdminMessageInbox(user_id=user.id, message_id=message.id, is_read=False))

    session.commit()
    session.close()


@pytest.mark.usefixtures("seed_event_modals_hub")
def test_event_modals_hub_endpoints_smoke(client: TestClient) -> None:
    streak_rules = client.get("/api/mission/streak/rules")
    assert streak_rules.status_code == 200
    rules_payload = streak_rules.json()
    assert isinstance(rules_payload, list)
    if rules_payload:
        assert "day" in rules_payload[0]
        assert "grants" in rules_payload[0]

    missions = client.get("/api/mission/")
    assert missions.status_code == 200
    missions_payload = missions.json()
    assert isinstance(missions_payload.get("missions"), list)
    assert "streak_info" in missions_payload

    vault = client.get("/api/vault/status")
    assert vault.status_code == 200
    vault_payload = vault.json()
    for key in ("eligible", "vault_balance", "ticket_count"):
        assert key in vault_payload

    lottery = client.get("/api/lottery/status")
    assert lottery.status_code == 200
    lottery_payload = lottery.json()
    assert isinstance(lottery_payload.get("prize_preview"), list)

    inbox = client.get("/api/crm/messages/inbox")
    assert inbox.status_code == 200
    inbox_payload = inbox.json()
    assert isinstance(inbox_payload, list)
    assert len(inbox_payload) == 1
    message_id = inbox_payload[0]["id"]

    read_resp = client.post(f"/api/crm/messages/{message_id}/read")
    assert read_resp.status_code == 200
    assert read_resp.json().get("status") == "ok"

    trial = client.post("/api/trial-grant", json={"token_type": "ROULETTE_COIN"})
    assert trial.status_code == 200
    trial_payload = trial.json()
    assert trial_payload.get("result") in ("OK", "SKIP")
    assert "balance" in trial_payload
