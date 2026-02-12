"""어드민 이벤트 API 통합 테스트.

테스트 범위:
- GET  /api/admin/events/valentine-seol/stats — 참여 통계 조회
- PATCH /api/admin/events/secret-codes/{code_id} — 코드 활성/비활성 토글
- POST /api/admin/events/valentine-seol/sync — 전역 동기화
"""
import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim
from app.v2.models.core.mission import Mission, UserMissionProgress


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db_session):
    """어드민 유저 생성."""
    user = V2User(
        cc_id="admin_event_test",
        nickname="어드민테스터",
        role=V2UserRole.ADMIN,
        status=V2UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def event_user_a(db_session):
    """이벤트 참여 유저 A."""
    user = V2User(
        cc_id="event_user_a",
        nickname="유저A",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def event_user_b(db_session):
    """이벤트 참여 유저 B."""
    user = V2User(
        cc_id="event_user_b",
        nickname="유저B",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def seed_missions(db_session):
    """이벤트 미션 5개 시드."""
    missions_data = [
        ("💝 발렌타인 럭키박스", "EVENT_VALENTINE_2026", "PLAY_GAME", 3, "TICKET_BUNDLE", 3),
        ("🧧 설날 DAY 1", "EVENT_SEOL_DAY1_2026", "CC_DEPOSIT", 100000, "BUNDLE", 23),
        ("🎮 설날 DAY 2", "EVENT_SEOL_DAY2_2026", "PLAY_GAME", 5, "BUNDLE", 21),
        ("💎 설날 DAY 3", "EVENT_SEOL_DAY3_2026", "CC_DEPOSIT", 300000, "BUNDLE", 22),
        ("🏆 4일 연속 달성", "EVENT_SEOL_STREAK_2026", "EVENT_STREAK", 4, "BUNDLE", 25),
    ]
    missions = []
    for title, logic_key, action_type, target, reward_type, reward_amount in missions_data:
        m = Mission(
            title=title,
            description=f"테스트: {title}",
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
        missions.append(m)
    db_session.commit()
    for m in missions:
        db_session.refresh(m)
    return {m.logic_key: m for m in missions}


@pytest.fixture
def seed_secret_codes(db_session):
    """비밀코드 4개 시드."""
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    codes_data = [
        ("LOVE2026", "2026-02-14", "ROULETTE_TICKET", 2),
        ("SEOL777", "2026-02-15", "LOTTERY_TICKET", 1),
        ("LUCKY888", "2026-02-16", "DICE_TICKET", 2),
        ("JACKPOT999", "2026-02-17", "POINT", 10000),
    ]
    codes = []
    for code, event_date, reward_type, reward_amount in codes_data:
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


# ── GET /valentine-seol/stats ────────────────────────────────────────────

class TestAdminEventStats:
    """어드민 이벤트 통계 API 테스트."""

    def test_stats_empty_200(self, test_client, admin_token, seed_missions, seed_secret_codes):
        """데이터 없을 때 200 + 0값 반환."""
        resp = test_client.get(
            "/api/admin/events/valentine-seol/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_participants"] == 0
        assert data["streak_completed_count"] == 0
        assert len(data["missions"]) == 5
        for m in data["missions"]:
            assert m["total_participants"] == 0
            assert m["completed_count"] == 0
            assert m["claimed_count"] == 0
            assert m["completion_rate"] == 0.0

    def test_stats_with_participants(
        self, test_client, admin_token, db_session, seed_missions, seed_secret_codes, event_user_a
    ):
        """미션 참여 데이터가 통계에 반영."""
        valentine = seed_missions["EVENT_VALENTINE_2026"]
        progress = UserMissionProgress(
            user_id=event_user_a.id,
            mission_id=valentine.id,
            current_value=2,
            is_completed=False,
            is_claimed=False,
            reset_date="SPECIAL",
        )
        db_session.add(progress)
        db_session.commit()

        resp = test_client.get(
            "/api/admin/events/valentine-seol/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_participants"] == 1

        valentine_stat = next(
            m for m in data["missions"] if m["logic_key"] == "EVENT_VALENTINE_2026"
        )
        assert valentine_stat["total_participants"] == 1
        assert valentine_stat["completed_count"] == 0

    def test_stats_completion_rate(
        self, test_client, admin_token, db_session, seed_missions, seed_secret_codes,
        event_user_a, event_user_b,
    ):
        """완료율 계산 정확성: 2명 참여, 1명 완료 → 50%."""
        valentine = seed_missions["EVENT_VALENTINE_2026"]
        db_session.add_all([
            UserMissionProgress(
                user_id=event_user_a.id, mission_id=valentine.id,
                current_value=3, is_completed=True, is_claimed=False,
                reset_date="SPECIAL",
            ),
            UserMissionProgress(
                user_id=event_user_b.id, mission_id=valentine.id,
                current_value=1, is_completed=False, is_claimed=False,
                reset_date="SPECIAL",
            ),
        ])
        db_session.commit()

        resp = test_client.get(
            "/api/admin/events/valentine-seol/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = resp.json()
        valentine_stat = next(
            m for m in data["missions"] if m["logic_key"] == "EVENT_VALENTINE_2026"
        )
        assert valentine_stat["total_participants"] == 2
        assert valentine_stat["completed_count"] == 1
        assert valentine_stat["completion_rate"] == 50.0

    def test_stats_streak_count(
        self, test_client, admin_token, db_session, seed_missions, seed_secret_codes, event_user_a,
    ):
        """스트릭 완료 카운트 반영."""
        streak = seed_missions["EVENT_SEOL_STREAK_2026"]
        db_session.add(UserMissionProgress(
            user_id=event_user_a.id, mission_id=streak.id,
            current_value=4, is_completed=True, is_claimed=False,
            reset_date="SPECIAL",
        ))
        db_session.commit()

        resp = test_client.get(
            "/api/admin/events/valentine-seol/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = resp.json()
        assert data["streak_completed_count"] == 1

    def test_stats_secret_code_claims(
        self, test_client, admin_token, db_session, seed_missions, seed_secret_codes,
        event_user_a, event_user_b,
    ):
        """비밀코드 claim 수 집계."""
        love_code = next(c for c in seed_secret_codes if c.code == "LOVE2026")
        db_session.add_all([
            UserSecretCodeClaim(
                user_id=event_user_a.id,
                secret_code_id=love_code.id,
                claimed_at=datetime.now(ZoneInfo("Asia/Seoul")),
            ),
            UserSecretCodeClaim(
                user_id=event_user_b.id,
                secret_code_id=love_code.id,
                claimed_at=datetime.now(ZoneInfo("Asia/Seoul")),
            ),
        ])
        db_session.commit()

        resp = test_client.get(
            "/api/admin/events/valentine-seol/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = resp.json()
        love_stat = next(c for c in data["secret_codes"] if c["code"] == "LOVE2026")
        assert love_stat["claim_count"] == 2


# ── PATCH /secret-codes/{code_id} ────────────────────────────────────────

class TestAdminSecretCodeToggle:
    """비밀코드 활성/비활성 토글 테스트."""

    def test_toggle_deactivate(self, test_client, admin_token, db_session, seed_secret_codes):
        """코드 비활성화."""
        code = seed_secret_codes[0]
        resp = test_client.patch(
            f"/api/admin/events/secret-codes/{code.id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_active"] is False
        assert "비활성화" in data["message"]

        # DB 확인
        db_session.refresh(code)
        assert code.is_active is False

    def test_toggle_activate(self, test_client, admin_token, db_session, seed_secret_codes):
        """코드 재활성화."""
        code = seed_secret_codes[0]
        code.is_active = False
        db_session.commit()

        resp = test_client.patch(
            f"/api/admin/events/secret-codes/{code.id}",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_active"] is True
        assert "활성화" in data["message"]

    def test_toggle_not_found_404(self, test_client, admin_token):
        """존재하지 않는 코드 → 404."""
        resp = test_client.patch(
            "/api/admin/events/secret-codes/99999",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404
        assert resp.json()["detail"] == "SECRET_CODE_NOT_FOUND"


# ── POST /valentine-seol/sync ────────────────────────────────────────────

class TestAdminEventSync:
    """전역 동기화 테스트."""

    def test_sync_success(self, test_client, admin_token, seed_secret_codes):
        """동기화 200 + 성공 메시지."""
        resp = test_client.post(
            "/api/admin/events/valentine-seol/sync",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "전역 동기화 완료" in data["message"]
        assert "synced_at" in data

    def test_sync_updates_timestamp(self, test_client, admin_token, db_session, seed_secret_codes):
        """동기화 시 updated_at 타임스탬프가 갱신된다."""
        original_ts = seed_secret_codes[0].updated_at

        resp = test_client.post(
            "/api/admin/events/valentine-seol/sync",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

        db_session.expire_all()
        refreshed = db_session.query(EventSecretCode).filter(
            EventSecretCode.id == seed_secret_codes[0].id,
        ).first()
        # 동기화 후 updated_at이 변경되어야 한다
        assert refreshed.updated_at != original_ts or refreshed.updated_at is not None
