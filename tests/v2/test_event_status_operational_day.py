"""발렌타인/설날 이벤트 status API 운영일(09:00 KST 리셋) 필터링 테스트.

검증 목표:
- /api/events/valentine-seol/status 는 "현재 운영일"에 해당하는 미션만 반환한다.
- 09:00 KST 이전에는 운영일이 전날로 계산되어, 다음날 미션이 노출되지 않는다.

주의:
- 이 테스트는 API 레이어에서 수행되므로 TestClient + 의존성 override(get_db) + JWT(user_token)를 사용한다.
"""

from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest

from app.v2.models.core.mission import Mission


EVENT_MISSIONS = [
    ("EVENT_VALENTINE_2026", "2026-02-14 00:00:00", "2026-02-14 23:59:59"),
    ("EVENT_SEOL_DAY1_2026", "2026-02-15 00:00:00", "2026-02-15 23:59:59"),
    ("EVENT_SEOL_DAY2_2026", "2026-02-16 00:00:00", "2026-02-16 23:59:59"),
    ("EVENT_SEOL_DAY3_2026", "2026-02-17 00:00:00", "2026-02-17 23:59:59"),
    # 스트릭은 전체 기간으로 잡아 항상 현재 운영일에 포함되게 한다.
    ("EVENT_SEOL_STREAK_2026", "2026-02-14 00:00:00", "2026-02-17 23:59:59"),
]


def _seed_event_missions(db_session) -> None:
    for logic_key, start_dt, end_dt in EVENT_MISSIONS:
        db_session.add(
            Mission(
                title=f"seed {logic_key}",
                description="seed",
                category="SPECIAL",
                logic_key=logic_key,
                action_type="PLAY_GAME",
                target_value=1,
                reward_type="BUNDLE",
                reward_amount=1,
                xp_reward=0,
                requires_approval=False,
                auto_claim=False,
                is_active=True,
                start_date=datetime.fromisoformat(start_dt),
                end_date=datetime.fromisoformat(end_dt),
            )
        )
    db_session.commit()


class TestEventStatusOperationalDay:
    @pytest.mark.parametrize(
        "now_kst, expected_keys",
        [
            # 2/14 10:00 KST (운영일=2/14): 발렌타인 + 스트릭만
            (
                datetime(2026, 2, 14, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")),
                {"EVENT_VALENTINE_2026", "EVENT_SEOL_STREAK_2026"},
            ),
            # 2/16 01:00 KST (09시 이전 → 운영일=2/15): DAY1 + 스트릭만
            (
                datetime(2026, 2, 16, 1, 0, 0, tzinfo=ZoneInfo("Asia/Seoul")),
                {"EVENT_SEOL_DAY1_2026", "EVENT_SEOL_STREAK_2026"},
            ),
        ],
    )
    def test_status_filters_by_operational_day(
        self,
        test_client,
        user_token,
        db_session,
        now_kst,
        expected_keys,
    ):
        _seed_event_missions(db_session)

        with patch("app.v2.services.mission_service.V2MissionService._now_tz") as mock_now:
            mock_now.return_value = now_kst
            resp = test_client.get(
                "/api/events/valentine-seol/status",
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert resp.status_code == 200
        data = resp.json()
        got_keys = {m["logic_key"] for m in data["missions"]}
        assert got_keys == expected_keys
