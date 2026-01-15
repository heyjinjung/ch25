import datetime

from app.models.ops_target import OpsTargetList, OpsTargetMember
from app.models.user import User
from app.services.vault2_service import Vault2Service


def _create_campaign_and_plan(client):
    campaign = client.post(
        "/admin/api/ops/campaigns",
        json={"name": "test-campaign"},
    ).json()
    today = datetime.date.today().isoformat()
    plan = client.post(
        "/admin/api/ops/plans",
        json={"campaign_id": campaign["id"], "plan_date": today},
    ).json()
    return campaign, plan


def test_execute_golden_hour_task_updates_config(client, session_factory):
    _, plan = _create_campaign_and_plan(client)

    task = client.post(
        f"/admin/api/ops/plans/{plan['id']}/tasks",
        json={
            "title": "GH toggle",
            "type": "TOGGLE",
            "payload_json": {"kind": "GOLDEN_HOUR", "action": "MULTIPLIER_SET", "multiplier": 2.5},
        },
    ).json()

    resp = client.post(f"/admin/api/ops/tasks/{task['id']}/execute", json={"status": "DONE"})
    assert resp.status_code == 200

    session = session_factory()
    try:
        cfg = Vault2Service().get_config_value(session, "golden_hour_config", {})
    finally:
        session.close()

    assert cfg.get("manual_override") in {"AUTO", "FORCE_ON", "FORCE_OFF"}
    assert cfg.get("multiplier") == 2.5


def test_execute_message_template_marks_target_members_sent(client, session_factory):
    _, plan = _create_campaign_and_plan(client)

    session = session_factory()
    try:
        target_list = OpsTargetList(
            plan_id=plan["id"],
            name="test-list",
            source_type="SCENARIO",
            count_snapshot=2,
            is_processed=False,
        )
        session.add(target_list)
        session.flush()
        session.add_all(
            [
                User(id=1, external_id="ext1", nickname="u1"),
                User(id=2, external_id="ext2", nickname="u2"),
            ]
        )
        members = [
            OpsTargetMember(target_list_id=target_list.id, user_id=1, status="PENDING"),
            OpsTargetMember(target_list_id=target_list.id, user_id=2, status="PENDING"),
        ]
        session.add_all(members)
        session.commit()
        target_list_id = target_list.id
    finally:
        session.close()

    task = client.post(
        f"/admin/api/ops/plans/{plan['id']}/tasks",
        json={
            "title": "DM to target list",
            "type": "DM",
            "payload_json": {"kind": "MESSAGE_TEMPLATE", "target_list_id": target_list_id, "channel": "DM"},
        },
    ).json()

    resp = client.post(f"/admin/api/ops/tasks/{task['id']}/execute", json={"status": "DONE"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["payload_json"]["execution_result"]["sent_count"] == 2

    session = session_factory()
    try:
        statuses = [m.status for m in session.query(OpsTargetMember).filter_by(target_list_id=target_list_id).all()]
    finally:
        session.close()

    assert sorted(statuses) == ["SENT", "SENT"]
