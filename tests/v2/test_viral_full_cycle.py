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
    """V2 Native: 미션 생성부터 확인, 승인(텔레그램), 보상 지급까지의 풀 사이클 검증"""
    mock_check.return_value = True
    
    # 1. 미션 세트 생성 (JOIN_TELEGRAM_CHANNEL 및 SHARE_STORY)
    m1 = Mission(
        title="[V2] 공식 채널 가입",
        logic_key="v2_official_join",
        action_type="JOIN_TELEGRAM_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.PIZZA_GIFTICON_10000,
        reward_amount=1,
        category=MissionCategory.NEW_USER,
        requires_approval=True,
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
    
    # m1 (Telegram): Completed but PENDING approval
    assert p1 is not None and p1.is_completed is True
    assert p1.approval_status == ApprovalStatus.PENDING
    assert p1.is_claimed is False

    assert p2 is not None and p2.is_completed is True
    
    # 5. Claim m1 (Should fail due to PENDING)
    fail_claim = auth_client.post(
        f"/api/v2/mission/{m1.id}/claim",
        headers={"X-Idempotency-Key": "test_full_claim_1"}
    )
    assert fail_claim.status_code == 400
    assert "APPROVAL_PENDING" in fail_claim.json()["detail"]

    # 6. Admin Approve m1
    p1.approval_status = ApprovalStatus.APPROVED
    test_db_session.commit()

    # 7. Claim m1 (Success)
    success_claim = auth_client.post(
        f"/api/v2/mission/{m1.id}/claim",
        headers={"X-Idempotency-Key": "test_full_claim_2"}
    )
    assert success_claim.status_code == 200
    assert success_claim.json()["success"] is True

    test_db_session.refresh(p1)
    assert p1.is_claimed is True
    
    # 8. 멱등성 재검증 (이미 완료된 미션 재인증 시도)
    resp3 = auth_client.post("/api/viral/verify/channel", json={"mission_id": m1.id})
    assert "이미 인증되었거나" in resp3.json()["message"]

def test_viral_invalid_action_type(auth_client):
    """지원되지 않는 액션 타입 요청 시 400 에러 확인"""
    resp = auth_client.post("/api/viral/action", json={"action_type": "INVALID_ACTION", "mission_id": 999})
    assert resp.status_code == 400
    assert "not supported" in resp.json()["detail"]
