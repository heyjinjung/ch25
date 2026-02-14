"""발렌타인/설날 이벤트: 수동 클레임 E2E(API) 테스트.

검증 목표:
- 이벤트 status에서 완료/미수령 미션이 노출된다.
- POST /api/v2/mission/{id}/claim 로 수동 클레임이 성공한다(X-Idempotency-Key 필요).
- 클레임 이후 status에서 is_claimed=true 로 반영된다.

주의:
- 운영일(09:00 KST 리셋) 기준 시간 고정을 위해 V2MissionService._now_tz 를 patch 한다.
"""

from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from app.v2.models.core.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.v2.services.mission_service import V2MissionService


def _seed_event_day1_mission(db_session) -> Mission:
    mission = Mission(
        title="seed EVENT_SEOL_DAY1_2026",
        description="seed",
        category=MissionCategory.SPECIAL,
        logic_key="EVENT_SEOL_DAY1_2026",
        action_type="PLAY_GAME",
        target_value=5,
        reward_type=MissionRewardType.POINT,
        reward_amount=123,
        xp_reward=0,
        requires_approval=False,
        auto_claim=False,
        is_active=True,
        start_date=datetime(2026, 2, 15, 0, 0, 0),
        end_date=datetime(2026, 2, 15, 23, 59, 59),
    )
    db_session.add(mission)
    db_session.commit()
    db_session.refresh(mission)
    return mission


class TestEventManualClaimEndToEnd:
    def test_event_manual_claim_reflects_in_status(
        self,
        test_client,
        user_token,
        db_session,
        base_user,
    ):
        mission = _seed_event_day1_mission(db_session)

        # 2/16 01:00 KST 는 09시 이전이므로 운영일=2/15
        now_kst = datetime(2026, 2, 16, 1, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))

        # progress seed: SPECIAL 카테고리는 reset_date=NON_RESET 을 사용
        reset_date = "NON_RESET"

        db_session.add(
            UserMissionProgress(
                user_id=base_user.id,
                mission_id=mission.id,
                reset_date=reset_date,
                current_value=mission.target_value,
                is_completed=True,
                is_claimed=False,
            )
        )
        db_session.commit()

        with patch("app.v2.services.mission_service.V2MissionService._now_tz") as mock_now:
            mock_now.return_value = now_kst

            # 1) status: 미수령 상태
            resp_before = test_client.get(
                "/api/events/valentine-seol/status",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert resp_before.status_code == 200
            data_before = resp_before.json()
            targets_before = [m for m in data_before["missions"] if m["mission_id"] == mission.id]
            assert len(targets_before) == 1
            assert targets_before[0]["is_completed"] is True
            assert targets_before[0]["is_claimed"] is False

            # 2) claim
            claim_resp = test_client.post(
                f"/api/v2/mission/{mission.id}/claim",
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "X-Idempotency-Key": "test-event-claim-1",
                },
            )
            assert claim_resp.status_code == 200
            claim_data = claim_resp.json()
            assert claim_data["success"] is True
            assert claim_data["amount"] == 123
            assert "POINT" in str(claim_data["reward_type"])

            # 3) status: 수령 반영
            resp_after = test_client.get(
                "/api/events/valentine-seol/status",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert resp_after.status_code == 200
            data_after = resp_after.json()
            targets_after = [m for m in data_after["missions"] if m["mission_id"] == mission.id]
            assert len(targets_after) == 1
            assert targets_after[0]["is_completed"] is True
            assert targets_after[0]["is_claimed"] is True
