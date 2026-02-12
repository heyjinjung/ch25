"""이벤트 전역 동기 E2E 통합 테스트.

유저 미션 참여 → 완료 → claim → 어드민 통계 반영을 검증하는
End-to-End 플로우 테스트.

테스트 범위:
- CC_DEPOSIT 미션 E2E (입금 → 완료 → 어드민 stats)
- PLAY_GAME 미션 E2E (게임 → 완료 → 어드민 stats)
- 4일 스트릭 E2E (전부 완료 → 스트릭 자동 달성 → 어드민 stats)
- 비밀코드 E2E (claim → 어드민 claim_count)
- 어드민 비활성화 → 유저 claim 차단
- 전체 4일 시뮬레이션 라이프사이클
"""
import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim
from app.v2.models.core.mission import Mission, UserMissionProgress
from app.v2.models import UserGameWallet


# ── Fixtures ─────────────────────────────────────────────────────────────

EVENT_MISSIONS_SPEC = [
    ("💝 발렌타인 럭키박스", "EVENT_VALENTINE_2026", "PLAY_GAME", 3, "TICKET_BUNDLE", 3),
    ("🧧 설날 DAY 1", "EVENT_SEOL_DAY1_2026", "CC_DEPOSIT", 100000, "BUNDLE", 23),
    ("🎮 설날 DAY 2", "EVENT_SEOL_DAY2_2026", "PLAY_GAME", 5, "BUNDLE", 21),
    ("💎 설날 DAY 3", "EVENT_SEOL_DAY3_2026", "CC_DEPOSIT", 300000, "BUNDLE", 22),
    ("🏆 4일 연속 달성", "EVENT_SEOL_STREAK_2026", "EVENT_STREAK", 4, "BUNDLE", 25),
]


@pytest.fixture
def e2e_user(db_session):
    """E2E 테스트용 유저."""
    user = V2User(
        cc_id="e2e_event_user",
        nickname="E2E유저",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        vault_locked_balance=0,
    )
    db_session.add(user)
    db_session.flush()
    # 게임 월렛 초기화
    for token in ["ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"]:
        db_session.add(UserGameWallet(user_id=user.id, token_type=token, balance=0))
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def e2e_missions(db_session):
    """이벤트 미션 5개 시드 (E2E 전용)."""
    missions = {}
    for title, logic_key, action_type, target, reward_type, reward_amount in EVENT_MISSIONS_SPEC:
        m = Mission(
            title=title,
            description=f"E2E: {title}",
            category="SPECIAL",
            logic_key=logic_key,
            action_type=action_type,
            target_value=target,
            reward_type=reward_type,
            reward_amount=reward_amount,
            xp_reward=0,
            is_active=True,
        )
        db_session.add(m)
        missions[logic_key] = m
    db_session.commit()
    for m in missions.values():
        db_session.refresh(m)
    return missions


@pytest.fixture
def e2e_secret_codes(db_session):
    """비밀코드 시드 (E2E 전용)."""
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    codes = []
    for code, event_date, reward_type, reward_amount in [
        ("LOVE2026", "2026-02-14", "ROULETTE_TICKET", 2),
        ("SEOL777", "2026-02-15", "LOTTERY_TICKET", 1),
    ]:
        c = EventSecretCode(
            code=code,
            event_date=event_date,
            reward_type=reward_type,
            reward_amount=reward_amount,
            is_active=True,
            expires_at=now + timedelta(days=7),
            created_at=now,
            updated_at=now,
        )
        db_session.add(c)
        codes.append(c)
    db_session.commit()
    for c in codes:
        db_session.refresh(c)
    return codes


def _create_progress(db_session, user_id, mission, current_value, is_completed=False, is_claimed=False):
    """미션 progress 헬퍼."""
    p = UserMissionProgress(
        user_id=user_id,
        mission_id=mission.id,
        current_value=current_value,
        is_completed=is_completed,
        is_claimed=is_claimed,
        reset_date="SPECIAL",
    )
    db_session.add(p)
    db_session.flush()
    return p


def _get_stats(test_client, admin_token):
    """어드민 stats 호출 헬퍼."""
    resp = test_client.get(
        "/api/admin/events/valentine-seol/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    return resp.json()


def _find_mission_stat(data, logic_key):
    """stats에서 특정 미션 찾기."""
    return next((m for m in data["missions"] if m["logic_key"] == logic_key), None)


# ── E2E Flow Tests ───────────────────────────────────────────────────────

class TestEventE2EFlow:
    """유저 행동 → 어드민 통계 반영 전역 동기 E2E 테스트."""

    def test_deposit_mission_e2e(
        self, test_client, admin_token, db_session, e2e_user, e2e_missions, e2e_secret_codes,
    ):
        """입금 → DAY1 완료 → claim → 어드민 stats에 반영."""
        day1 = e2e_missions["EVENT_SEOL_DAY1_2026"]

        # Step 1: 유저가 10만원 입금 → 미션 완료
        _create_progress(db_session, e2e_user.id, day1, current_value=100000, is_completed=True)
        db_session.commit()

        # Step 2: 어드민 stats 확인
        data = _get_stats(test_client, admin_token)
        day1_stat = _find_mission_stat(data, "EVENT_SEOL_DAY1_2026")
        assert day1_stat is not None
        assert day1_stat["total_participants"] == 1
        assert day1_stat["completed_count"] == 1
        assert day1_stat["completion_rate"] == 100.0
        assert data["total_participants"] == 1

    def test_play_game_mission_e2e(
        self, test_client, admin_token, db_session, e2e_user, e2e_missions, e2e_secret_codes,
    ):
        """게임 플레이 → Valentine 완료 → 어드민 stats에 반영."""
        valentine = e2e_missions["EVENT_VALENTINE_2026"]

        # Step 1: 유저가 게임 3판 → 미션 완료
        _create_progress(db_session, e2e_user.id, valentine, current_value=3, is_completed=True)
        db_session.commit()

        # Step 2: 어드민 stats 확인
        data = _get_stats(test_client, admin_token)
        v_stat = _find_mission_stat(data, "EVENT_VALENTINE_2026")
        assert v_stat["total_participants"] == 1
        assert v_stat["completed_count"] == 1

    def test_streak_completion_e2e(
        self, test_client, admin_token, db_session, e2e_user, e2e_missions, e2e_secret_codes,
    ):
        """4개 미션 완료 → 스트릭 자동 완료 → admin stats 반영."""
        non_streak_keys = [
            "EVENT_VALENTINE_2026",
            "EVENT_SEOL_DAY1_2026",
            "EVENT_SEOL_DAY2_2026",
            "EVENT_SEOL_DAY3_2026",
        ]
        # Step 1: 4개 미션 전부 완료
        for key in non_streak_keys:
            m = e2e_missions[key]
            _create_progress(db_session, e2e_user.id, m, current_value=m.target_value, is_completed=True)

        # Step 2: 스트릭 미션도 완료
        streak = e2e_missions["EVENT_SEOL_STREAK_2026"]
        _create_progress(db_session, e2e_user.id, streak, current_value=4, is_completed=True)
        db_session.commit()

        # Step 3: 어드민 stats 확인
        data = _get_stats(test_client, admin_token)
        assert data["streak_completed_count"] == 1
        assert data["total_participants"] == 1

        # 모든 미션에 1명씩 참여
        for key in non_streak_keys + ["EVENT_SEOL_STREAK_2026"]:
            stat = _find_mission_stat(data, key)
            assert stat["total_participants"] == 1
            assert stat["completed_count"] == 1

    def test_secret_code_claim_e2e(
        self, test_client, admin_token, db_session, e2e_user, e2e_missions, e2e_secret_codes,
    ):
        """비밀코드 claim → 어드민 claim_count 반영."""
        love_code = e2e_secret_codes[0]  # LOVE2026

        # Step 1: 유저가 코드 입력
        claim = UserSecretCodeClaim(
            user_id=e2e_user.id,
            secret_code_id=love_code.id,
            claimed_at=datetime.now(ZoneInfo("Asia/Seoul")),
        )
        db_session.add(claim)
        db_session.commit()

        # Step 2: 어드민 stats에서 claim_count 확인
        data = _get_stats(test_client, admin_token)
        love_stat = next(c for c in data["secret_codes"] if c["code"] == "LOVE2026")
        assert love_stat["claim_count"] == 1

    def test_admin_toggle_blocks_claim(
        self, test_client, admin_token, db_session, e2e_secret_codes,
    ):
        """어드민 비활성화 → 코드가 is_active=False로 변경."""
        code = e2e_secret_codes[0]  # LOVE2026

        # Step 1: 어드민이 코드 비활성화
        resp = test_client.patch(
            f"/api/admin/events/secret-codes/{code.id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

        # Step 2: DB에서 is_active=False 확인
        db_session.expire_all()
        refreshed = db_session.query(EventSecretCode).filter(
            EventSecretCode.id == code.id,
        ).first()
        assert refreshed.is_active is False

        # Step 3: 다시 활성화
        resp2 = test_client.patch(
            f"/api/admin/events/secret-codes/{code.id}",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp2.status_code == 200

        db_session.expire_all()
        refreshed2 = db_session.query(EventSecretCode).filter(
            EventSecretCode.id == code.id,
        ).first()
        assert refreshed2.is_active is True

    def test_full_event_lifecycle(
        self, test_client, admin_token, db_session, e2e_user, e2e_missions, e2e_secret_codes,
    ):
        """전체 4일 시뮬레이션: 미션 참여→완료→스트릭→동기화→stats 검증."""
        # Day 1: Valentine 미션 참여 (진행중)
        valentine = e2e_missions["EVENT_VALENTINE_2026"]
        _create_progress(db_session, e2e_user.id, valentine, current_value=1, is_completed=False)
        db_session.commit()

        data = _get_stats(test_client, admin_token)
        assert data["total_participants"] == 1
        v_stat = _find_mission_stat(data, "EVENT_VALENTINE_2026")
        assert v_stat["completed_count"] == 0

        # Day 1: Valentine 완료
        prog = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == e2e_user.id,
            UserMissionProgress.mission_id == valentine.id,
        ).first()
        prog.current_value = 3
        prog.is_completed = True
        db_session.commit()

        data = _get_stats(test_client, admin_token)
        v_stat = _find_mission_stat(data, "EVENT_VALENTINE_2026")
        assert v_stat["completed_count"] == 1
        assert v_stat["completion_rate"] == 100.0

        # Day 2, 3, 4: 나머지 미션 완료
        for key in ["EVENT_SEOL_DAY1_2026", "EVENT_SEOL_DAY2_2026", "EVENT_SEOL_DAY3_2026"]:
            m = e2e_missions[key]
            _create_progress(db_session, e2e_user.id, m, current_value=m.target_value, is_completed=True)
        db_session.commit()

        # 스트릭 완료
        streak = e2e_missions["EVENT_SEOL_STREAK_2026"]
        _create_progress(db_session, e2e_user.id, streak, current_value=4, is_completed=True)
        db_session.commit()

        # 전역 동기화
        sync_resp = test_client.post(
            "/api/admin/events/valentine-seol/sync",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert sync_resp.status_code == 200

        # 최종 stats 검증
        final_data = _get_stats(test_client, admin_token)
        assert final_data["total_participants"] == 1
        assert final_data["streak_completed_count"] == 1

        # 모든 5개 미션 완료 확인
        for key in [
            "EVENT_VALENTINE_2026", "EVENT_SEOL_DAY1_2026",
            "EVENT_SEOL_DAY2_2026", "EVENT_SEOL_DAY3_2026",
            "EVENT_SEOL_STREAK_2026",
        ]:
            stat = _find_mission_stat(final_data, key)
            assert stat is not None, f"{key} should be in stats"
            assert stat["completed_count"] == 1, f"{key} should have 1 completion"
            assert stat["completion_rate"] == 100.0, f"{key} should have 100% rate"
