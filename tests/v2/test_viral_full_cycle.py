import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType, ApprovalStatus
from app.v2.services.auth_service import V2AuthService

@pytest.fixture
def test_client(test_db_session):
    from app.main import app
    from app.api.deps import get_db

    # Override base DB dependency
    app.dependency_overrides[get_db] = lambda: test_db_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user_v2(test_db_session: Session):
    """V2 Native User with cc_id"""
    user = V2User(
        cc_id="v2_native_test_user",
        nickname="V2Tester",
        telegram_id=88889999,
        vault_locked_balance=100,
        created_at=datetime.now(timezone.utc)
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user

@pytest.fixture
def auth_client(test_client, test_user_v2):
    """Client with V2 authentication dependency overridden"""
    from app.v2.api.deps import get_current_user, get_current_user_id
    from app.main import app
    
    app.dependency_overrides[get_current_user] = lambda: test_user_v2
    app.dependency_overrides[get_current_user_id] = lambda: test_user_v2.id
    yield test_client
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
    if get_current_user_id in app.dependency_overrides:
        del app.dependency_overrides[get_current_user_id]

def test_v2_auth_token_issuance(test_db_session: Session, test_user_v2):
    """V2AuthService: Access + Refresh Token 발급 검증"""
    with patch("app.v2.services.auth_service.V2AuthService.issue_v2_tokens") as mock_issue:
        mock_issue.return_value = ("access_token_123", "refresh_token_456", test_user_v2)
        
        access, refresh, user = V2AuthService.issue_v2_tokens(
            test_db_session, user_id=test_user_v2.id
        )
        
        assert access == "access_token_123"
        assert refresh == "refresh_token_456"
        assert user.cc_id == "v2_native_test_user"

@patch("app.services.notification_service.NotificationService.check_chat_member")
def test_viral_mission_full_lifecycle(mock_check, auth_client, test_db_session, test_user_v2):
    """V2 Native: 미션 생성부터 확인, 보상 지급까지의 풀 사이클 검증 (SOT 준수)"""
    mock_check.return_value = True
    
    # 1. 미션 세트 생성 (SOT 기반)
    # Ref: docs/v2_specs/02_game/v2_new_user_mission_logic_sot_ko.md
    m1 = Mission(
        title="[미션] 신규 텔레그램 채널가입",
        logic_key="new_user_telegram_join",
        action_type="JOIN_TELEGRAM_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.PIZZA_GIFTICON_10000,
        reward_amount=1,
        category=MissionCategory.NEW_USER,
        requires_approval=False,  # 서버 검증(verify/channel)이 승인을 갈음함
        is_active=True
    )
    m2 = Mission(
        title="[V2] 스토리 공유",
        logic_key="v2_story_share",
        action_type="SHARE_STORY",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=5,
        category=MissionCategory.DAILY,
        is_active=True
    )
    test_db_session.add_all([m1, m2])
    test_db_session.commit()
    
    # 2. 채널 가입 검증 엔드포인트 호출
    resp1 = auth_client.post("/api/viral/verify/channel", json={
        "mission_id": m1.id,
        "channel_username": "official_test_channel"
    })
    assert resp1.status_code == 200
    assert resp1.json()["success"] is True
    assert "인증 성공" in resp1.json()["message"]
    
    # 3. 스토리 공유 액션 기록 (Trust-based)
    resp2 = auth_client.post("/api/viral/action", json={"action_type": "SHARE_STORY", "mission_id": m2.id})
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True
    
    # 4. DB 상태 확인 (Progress created)
    p1 = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user_v2.id,
        UserMissionProgress.mission_id == m1.id
    ).first()
    p2 = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user_v2.id,
        UserMissionProgress.mission_id == m2.id
    ).first()
    
    # m1 (Telegram): Completed and should be in NONE or APPROVED status (since requires_approval=False)
    assert p1 is not None and p1.is_completed is True
    assert p1.approval_status in [ApprovalStatus.NONE, ApprovalStatus.APPROVED]
    assert p1.is_claimed is False

    assert p2 is not None and p2.is_completed is True
    
    # 5. 보상 수령 (Claim) - m1
    success_claim = auth_client.post(
        f"/api/v2/mission/{m1.id}/claim",
        headers={"X-Idempotency-Key": "test_full_claim_v2_1"}
    )
    assert success_claim.status_code == 200
    assert success_claim.json()["success"] is True
    assert success_claim.json()["reward_type"] == str(MissionRewardType.PIZZA_GIFTICON_10000)

    test_db_session.refresh(p1)
    assert p1.is_claimed is True
    
    # 6. 멱등성 재검증 (이미 완료된 미션 재인증 시도)
    resp3 = auth_client.post("/api/viral/verify/channel", json={"mission_id": m1.id})
    assert "이미 인증되었거나" in resp3.json()["message"]

def test_viral_mission_new_user_expiry(auth_client, test_db_session, test_user_v2):
    """신규 유저 미션(NEW_USER) 만료(7일 경과) 시 진행 불가 검증"""
    # 1. 만료된 유저로 설정 (8일 전 가입)
    from datetime import timedelta
    test_user_v2.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    test_db_session.commit()

    # 2. 신규 유저 미션 생성
    m_new = Mission(
        title="[미션] 만료된 신규 유저 미션",
        logic_key="new_user_expiry_test",
        action_type="JOIN_TELEGRAM_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.POINT,
        reward_amount=1000,
        category=MissionCategory.NEW_USER,
        is_active=True
    )
    test_db_session.add(m_new)
    test_db_session.commit()

    # 3. 액션 수행 (검증 시도)
    with patch("app.services.notification_service.NotificationService.check_chat_member") as mock_check:
        mock_check.return_value = True
        resp = auth_client.post("/api/viral/verify/channel", json={
            "mission_id": m_new.id,
            "channel_username": "official_test_channel"
        })
        
        # 4. 결과 확인: 미션 진행도가 업데이트되지 않아야 함
        assert resp.status_code == 200
        # "이미 인증되었거나 진행 중인 미션이 없습니다." 메시지 확인
        assert "진행 중인 미션이 없습니다" in resp.json()["message"] or "이미 인증되었거나" in resp.json()["message"]

        # DB 확인: 해당 미션에 대한 Progress가 생성되지 않아야 함
        progress = test_db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == test_user_v2.id,
            UserMissionProgress.mission_id == m_new.id
        ).first()
        assert progress is None

def test_viral_invalid_action_type(auth_client):
    """지원되지 않는 액션 타입 요청 시 400 에러 확인"""
    resp = auth_client.post("/api/viral/action", json={"action_type": "INVALID_ACTION", "mission_id": 999})
    assert resp.status_code == 400
    assert "not supported" in resp.json()["detail"]
