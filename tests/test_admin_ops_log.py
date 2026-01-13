from datetime import date
import pytest

from fastapi.testclient import TestClient
from app.services.ops_log_service import ALLOWED_ACTION_CODES


# RTP v13.0 설계서 기반 필수 action_code 집합
RTP_V13_ACTION_CODES = {
    "ADMIN_MANUAL_GRANT",
    "ANALYSIS_RETENTION_GAP_RECORDED",
    "AUDIT_INVENTORY_REVIEW",
    "CS_DM_TEMPLATE_USED",
    "CS_SEND_LINK",
    "CS_SURVEY_DM",
    "EXP_AB_ASSIGNED",
    "EXP_AB_LIFECYCLE_UPDATED",
    "FEED_EVENT_PUBLISHED",
    "GAME_PLAY_RECORDED",
    "MARKETING_BROADCAST_SENT",
    "NOTIFICATION_DISPATCHED",
    "OFFER_PERSONALIZED_TRACKED",
    "OPS_ROUTINE_CHECKED",
    "OPS_SCHEDULE_UPDATED",
    "SEGMENT_BULK_ACTION_EXECUTED",
    "SEGMENT_QUERY_EXECUTED",
    "SESSION_EXTENSION_NUDGED",
    "SOCIAL_PROOF_PUBLISHED",
    "SYS_DEPOSIT_XP_RULE_UPDATED",
    "SYS_GAME_BASE_XP_UPDATED",
    "SYS_GOLDEN_HOUR_MULTIPLIER_SET",
    "SYS_GOLDEN_HOUR_TOGGLE",
    "SYS_JACKPOT_DRAW_PAYOUT",
    "SYS_JACKPOT_POOL_INCREMENT",
    "SYS_LEADERBOARD_RULE_UPDATED",
    "SYS_LOSS_RECOVERY_PAYOUT",
    "SYS_MISSION_MACRO_UPDATED",
    "SYS_MYSTERY_REWARD_RULE_UPDATED",
    "SYS_NEAR_MISS_TOGGLE",
    "SYS_TRIAL_GRANT_POLICY_UPDATED",
    "SYS_VIP_TIER_RULE_UPDATED",
    "SYS_WEEKLY_CASHBACK_PAYOUT",
    "SYS_WIN_STREAK_RULE_UPDATED",
    "SYS_WELCOME_EXPOSURE_UPDATED",
    "USER_ACHIEVEMENT_UNLOCKED",
    "USER_DAILY_SPIN",
    "USER_GRANT_SURVEY_REWARD",
    "USER_MISSION_MACRO_REWARD",
    "USER_TRIAL_GRANT",
    "USER_VIP_TIER_CHANGED",
    "USER_WIN_STREAK_REWARD",
    "LOSS_RECOVERY_PAYOUT",
}


@pytest.fixture()
def sample_payload():
    return {
        "date": date.today().isoformat(),
        "category": "ROUTINE",
        "action_code": "OPS_ROUTINE_CHECKED",
        "target_model": "SYSTEM",
        "target_id": None,
        "meta_data": {"slot": "09:00"},
        "ref_id": "REF-OPS-1",
        "is_automated": False,
    }


def test_create_log_entry_idempotent(client: TestClient, sample_payload):
    r1 = client.post("/admin/api/ops/log-entry", json=sample_payload)
    assert r1.status_code == 201
    body1 = r1.json()

    r2 = client.post("/admin/api/ops/log-entry", json=sample_payload)
    assert r2.status_code == 200
    body2 = r2.json()
    assert body1["id"] == body2["id"]
    assert body2["ref_id"] == sample_payload["ref_id"]


def test_list_log_entries_filters(client: TestClient, sample_payload):
    client.post("/admin/api/ops/log-entry", json=sample_payload)
    res = client.get(f"/admin/api/ops/log-entry?date={sample_payload['date']}&category=ROUTINE")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 1
    assert rows[0]["category"] == "ROUTINE"


def test_export_daily_log(client: TestClient, sample_payload):
    client.post("/admin/api/ops/log-entry", json=sample_payload)
    res = client.get(f"/admin/api/ops/daily-log/{sample_payload['date']}/export")
    assert res.status_code == 200
    assert "ops_log.md" in res.headers.get("Content-Disposition", "")
    assert "OPS_ROUTINE_CHECKED" in res.text


def test_invalid_action_code_rejected(client: TestClient, sample_payload):
    bad = dict(sample_payload)
    bad["action_code"] = "UNKNOWN_CODE"
    res = client.post("/admin/api/ops/log-entry", json=bad)
    assert res.status_code == 422
    assert "ACTION_CODE_INVALID" in res.text


def test_meta_schema_missing_field(client: TestClient, sample_payload):
    bad = dict(sample_payload)
    bad["meta_data"] = {}  # missing required fields for SYSTEM_EVENT
    bad["action_code"] = "SYS_GOLDEN_HOUR_TOGGLE"
    res = client.post("/admin/api/ops/log-entry", json=bad)
    assert res.status_code == 422
    assert "META_DATA_MISSING" in res.text


def test_pii_masking_applied(client: TestClient, sample_payload):
    bad = dict(sample_payload)
    bad["meta_data"] = {"note": "전화 010-1234-5678"}
    res = client.post("/admin/api/ops/log-entry", json=bad)
    assert res.status_code == 201
    body = res.json()
    assert "***" in body["meta_data"]["note"]


def test_allowlist_covers_rtp_v13():
    missing = RTP_V13_ACTION_CODES - ALLOWED_ACTION_CODES
    assert not missing, f"allowlist missing: {sorted(missing)}"
