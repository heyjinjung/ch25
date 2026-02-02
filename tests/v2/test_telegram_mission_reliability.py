import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.v2.models.user import V2User
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType, ApprovalStatus

@pytest.fixture
def test_client(test_db_session):
    from app.main import app
    from app.api.deps import get_db

    app.dependency_overrides[get_db] = lambda: test_db_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(test_db_session: Session):
    # Use V2User with cc_id (V2 Native standard)
    user = V2User(
        cc_id="test_viral_user_v2",
        nickname="ViralTesterV2",
        telegram_id=12345678,
        vault_locked_balance=0,
        created_at=datetime.now(timezone.utc)
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user

@pytest.fixture
def auth_client(test_client, test_user):
    from app.v2.api.deps import get_current_user, get_current_user_id
    from app.main import app
    
    # Override V2 dependency
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_current_user_id] = lambda: test_user.id
    yield test_client
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
    if get_current_user_id in app.dependency_overrides:
        del app.dependency_overrides[get_current_user_id]

def test_mission_action_type_aliases(test_db_session: Session, test_user):
    """V2MissionService의 Action Type Alias 처리가 정상인지 확인"""
    from app.v2.services.mission_service import V2MissionService
    
    # 1. 미션 생성 (SUBSCRIBE_CHANNEL 타입)
    mission = Mission(
        title="채널 가입 테스트",
        logic_key="test_channel_join_v2",
        action_type="SUBSCRIBE_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=1,
        category=MissionCategory.DAILY,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    service = V2MissionService(test_db_session)
    
    # 2. 'JOIN_CHANNEL' 액션으로 업데이트 시도 (Alias 매칭 확인)
    service.update_progress(test_user.id, "JOIN_CHANNEL", delta=1)
    
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    
    assert progress is not None
    assert progress.is_completed is True
    assert progress.current_value == 1

def test_new_user_mission_eligibility(test_db_session, test_user):
    """신규 유저(7일 이내) 판정 로직 검증"""
    from app.v2.services.mission_service import V2MissionService
    service = V2MissionService(test_db_session)

    # 1. 7일 이내 유저 (test_user created now)
    assert service._is_new_user(test_user.id) is True

    # 2. 7일 지난 유저
    old_user = V2User(
        cc_id="old_user_v2", 
        nickname="OldOne", 
        telegram_id=999,
        created_at=datetime.now(timezone.utc) - timedelta(days=8)
    )
    test_db_session.add(old_user)
    test_db_session.commit()
    test_db_session.refresh(old_user)
    
    assert service._is_new_user(old_user.id) is False

@patch("app.services.notification_service.NotificationService.check_chat_member")
def test_telegram_mission_approval_flow(mock_check, auth_client, test_db_session, test_user):
    """텔레그램 채널 가입: 검증 -> 승인 대기 -> 관리자 승인 -> 클레임"""
    mock_check.return_value = True
    
    # 1. 텔레그램 미션 생성 (requires_approval=True)
    mission = Mission(
        title="신규 텔레그램 채널가입",
        logic_key="NEW_USER_TELEGRAM_JOIN",
        action_type="JOIN_TELEGRAM_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.PIZZA_GIFTICON_10000,
        reward_amount=1,
        category=MissionCategory.NEW_USER,
        requires_approval=True,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    # 2. 검증 API 호출
    response = auth_client.post(
        "/api/viral/verify/channel",
        json={"mission_id": mission.id, "channel_username": "test_channel"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 3. 진행 상태 확인 (PENDING)
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    assert progress.is_completed is True
    assert progress.approval_status == ApprovalStatus.PENDING
    
    # 4. 클레임 시도 (실패해야 함 - APPROVAL_PENDING)
    # Header required
    claim_resp = auth_client.post(
        f"/api/v2/mission/{mission.id}/claim",
        headers={"X-Idempotency-Key": "test_claim_1"}
    )
    assert claim_resp.status_code == 400
    assert "APPROVAL_PENDING" in claim_resp.json()["detail"]

    # 5. 관리자 승인 (Simulated via DB update directly)
    progress.approval_status = ApprovalStatus.APPROVED
    test_db_session.commit()

    # 6. 클레임 재시도 (성공)
    claim_resp = auth_client.post(
        f"/api/v2/mission/{mission.id}/claim",
        headers={"X-Idempotency-Key": "test_claim_2"}
    )
    
    if claim_resp.status_code != 200:
        print(claim_resp.json())
        
    assert claim_resp.status_code == 200
    assert claim_resp.json()["success"] is True
    
    test_db_session.refresh(progress)
    assert progress.is_claimed is True

@patch("app.services.notification_service.NotificationService.check_chat_member")
def test_cc_mission_auto_approval(mock_check, auth_client, test_db_session, test_user):
    """CC 채널 가입: 검증 -> 자동 승인 -> 클레임"""
    mock_check.return_value = True
    
    # 1. CC 미션 생성 (requires_approval=False)
    mission = Mission(
        title="신규 CC채널가입",
        logic_key="NEW_USER_CC_CHANNEL_JOIN",
        action_type="JOIN_CC_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.POINT,
        reward_amount=2000,
        category=MissionCategory.NEW_USER,
        requires_approval=False,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    # 2. 검증 API 호출
    response = auth_client.post(
        "/api/viral/verify/channel",
        json={"mission_id": mission.id, "channel_username": "cc_official"}
    )
    assert response.status_code == 200
    
    # 3. 진행 상태 확인
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    assert progress.is_completed is True
    # approval_status defaults to NONE or whatever, which is fine since requires_approval=False
    
    # 4. 클레임 시도 (성공해야 함)
    claim_resp = auth_client.post(
        f"/api/v2/mission/{mission.id}/claim",
        headers={"X-Idempotency-Key": "test_claim_cc"}
    )
    assert claim_resp.status_code == 200
    assert claim_resp.json()["success"] is True

def test_viral_action_trust_based(auth_client, test_db_session, test_user):
    """POST /api/viral/action (신뢰 기반 공유) 동작 확인"""
    # 1. 스토리 공유 미션 생성
    mission = Mission(
        title="스토리 공유하기",
        logic_key="story_share_test",
        action_type="SHARE_STORY",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=5,
        category=MissionCategory.DAILY,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    # 2. API 호출
    response = auth_client.post(
        "/api/viral/action",
        json={"action_type": "SHARE_STORY", "mission_id": mission.id}
    )
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # 3. DB 확인
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    assert progress.is_completed is True
