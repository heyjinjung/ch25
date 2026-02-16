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


EVENT_MISSIONS = [
    # (logic_key, start_date, end_date, target_value)
    ("EVENT_VALENTINE_2026", datetime(2026, 2, 14, 0, 0, 0), datetime(2026, 2, 14, 23, 59, 59), 1),
    ("EVENT_SEOL_DAY1_2026", datetime(2026, 2, 15, 0, 0, 0), datetime(2026, 2, 15, 23, 59, 59), 1),
    ("EVENT_SEOL_DAY2_2026", datetime(2026, 2, 16, 0, 0, 0), datetime(2026, 2, 16, 23, 59, 59), 1),
    ("EVENT_SEOL_DAY3_2026", datetime(2026, 2, 17, 0, 0, 0), datetime(2026, 2, 17, 23, 59, 59), 1),
    # 4일 연속 보너스는 스트릭 미션(target=4) 완료 후 수동 클레임
    ("EVENT_SEOL_STREAK_2026", datetime(2026, 2, 14, 0, 0, 0), datetime(2026, 2, 17, 23, 59, 59), 4),
]


def _seed_event_missions(db_session) -> dict[str, Mission]:
    out: dict[str, Mission] = {}
    for logic_key, start_dt, end_dt, target_value in EVENT_MISSIONS:
        mission = Mission(
            title=f"seed {logic_key}",
            description="seed",
            category=MissionCategory.SPECIAL,
            logic_key=logic_key,
            action_type="PLAY_GAME",
            target_value=target_value,
            reward_type=MissionRewardType.POINT,
            reward_amount=0,
            xp_reward=0,
            requires_approval=False,
            auto_claim=False,
            is_active=True,
            start_date=start_dt,
            end_date=end_dt,
        )
        db_session.add(mission)
        out[logic_key] = mission

    db_session.commit()
    for logic_key, mission in out.items():
        db_session.refresh(mission)
        out[logic_key] = mission
    return out


class TestEventManualClaimEndToEnd:
    def test_event_manual_claim_reflects_in_status_all_days(
        self,
        test_client,
        user_token,
        db_session,
        base_user,
    ):
        missions = _seed_event_missions(db_session)

        reset_date = "NON_RESET"

        streak_mission = missions["EVENT_SEOL_STREAK_2026"]
        streak_progress = UserMissionProgress(
            user_id=base_user.id,
            mission_id=streak_mission.id,
            reset_date=reset_date,
            current_value=0,
            is_completed=False,
            is_claimed=False,
        )
        db_session.add(streak_progress)
        db_session.commit()
        db_session.refresh(streak_progress)

        day_cases = [
            # 2/14 10:00 KST (운영일=2/14): 발렌타인
            (datetime(2026, 2, 14, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")), "EVENT_VALENTINE_2026"),
            # 2/16 01:00 KST (09시 이전 → 운영일=2/15): DAY1
            (datetime(2026, 2, 16, 1, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")), "EVENT_SEOL_DAY1_2026"),
            # 2/16 10:00 KST (운영일=2/16): DAY2
            (datetime(2026, 2, 16, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")), "EVENT_SEOL_DAY2_2026"),
            # 2/17 10:00 KST (운영일=2/17): DAY3
            (datetime(2026, 2, 17, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")), "EVENT_SEOL_DAY3_2026"),
        ]

        for idx, (now_kst, logic_key) in enumerate(day_cases, start=1):
            day_mission = missions[logic_key]

            db_session.add(
                UserMissionProgress(
                    user_id=base_user.id,
                    mission_id=day_mission.id,
                    reset_date=reset_date,
                    current_value=day_mission.target_value,
                    is_completed=True,
                    is_claimed=False,
                )
            )

            # 스트릭 진행도는 단일 row를 update (UNIQUE 충돌 방지)
            streak_progress.current_value = idx
            streak_progress.is_completed = idx >= int(streak_mission.target_value)
            db_session.commit()

            with patch("app.v2.services.mission_service.V2MissionService._now_tz") as mock_now:
                mock_now.return_value = now_kst

                resp_before = test_client.get(
                    "/api/events/valentine-seol/status",
                    headers={"Authorization": f"Bearer {user_token}"},
                )
                assert resp_before.status_code == 200
                data_before = resp_before.json()
                targets_before = [m for m in data_before["missions"] if m["mission_id"] == day_mission.id]
                assert len(targets_before) == 1
                assert targets_before[0]["is_completed"] is True
                assert targets_before[0]["is_claimed"] is False

                claim_resp = test_client.post(
                    f"/api/v2/mission/{day_mission.id}/claim",
                    headers={
                        "Authorization": f"Bearer {user_token}",
                        "X-Idempotency-Key": f"test-event-claim-day-{idx}",
                    },
                )
                assert claim_resp.status_code == 200
                claim_data = claim_resp.json()
                assert claim_data["success"] is True
                assert claim_data["amount"] == 0
                assert "POINT" in str(claim_data["reward_type"])

                resp_after = test_client.get(
                    "/api/events/valentine-seol/status",
                    headers={"Authorization": f"Bearer {user_token}"},
                )
                assert resp_after.status_code == 200
                data_after = resp_after.json()
                targets_after = [m for m in data_after["missions"] if m["mission_id"] == day_mission.id]
                assert len(targets_after) == 1
                assert targets_after[0]["is_completed"] is True
                assert targets_after[0]["is_claimed"] is True

        # 4일차(스트릭 보너스) 수동 클레임: 2/18 01:00 KST 는 운영일=2/17
        streak_progress.current_value = int(streak_mission.target_value)
        streak_progress.is_completed = True
        streak_progress.is_claimed = False
        db_session.commit()

        with patch("app.v2.services.mission_service.V2MissionService._now_tz") as mock_now:
            mock_now.return_value = datetime(2026, 2, 18, 1, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))

            resp_before = test_client.get(
                "/api/events/valentine-seol/status",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert resp_before.status_code == 200
            data_before = resp_before.json()
            targets_before = [m for m in data_before["missions"] if m["mission_id"] == streak_mission.id]
            assert len(targets_before) == 1
            assert targets_before[0]["is_completed"] is True
            assert targets_before[0]["is_claimed"] is False

            claim_resp = test_client.post(
                f"/api/v2/mission/{streak_mission.id}/claim",
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "X-Idempotency-Key": "test-event-claim-streak-4",
                },
            )
            assert claim_resp.status_code == 200
            claim_data = claim_resp.json()
            assert claim_data["success"] is True

            resp_after = test_client.get(
                "/api/events/valentine-seol/status",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert resp_after.status_code == 200
            data_after = resp_after.json()
            targets_after = [m for m in data_after["missions"] if m["mission_id"] == streak_mission.id]
            assert len(targets_after) == 1
            assert targets_after[0]["is_completed"] is True
            assert targets_after[0]["is_claimed"] is True
