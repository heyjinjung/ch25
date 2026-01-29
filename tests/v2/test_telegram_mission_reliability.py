import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.v2.models.user import V2User
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType

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
        vault_locked_balance=0
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user

@pytest.fixture
def auth_client(test_client, test_user):
    from app.v2.api.deps import get_current_user
    from app.main import app
    
    # Override V2 dependency
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield test_client
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

def test_mission_action_type_aliases(test_db_session: Session):
    """MissionService의 Action Type Alias 처리가 정상인지 확인"""
    from app.services.mission_service import MissionService
    
    # 1. 미션 생성 (SUBSCRIBE_CHANNEL 타입)
    mission = Mission(
        title="채널 가입 테스트",
        logic_key="test_channel_join",
        action_type="SUBSCRIBE_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=1,
        category=MissionCategory.DAILY,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    service = MissionService(test_db_session)
    
    # 2. 'JOIN_CHANNEL' 액션으로 업데이트 시도 (Alias 매칭 확인)
    user_id = 12345 # Any unique ID
    service.update_progress(user_id, "JOIN_CHANNEL", delta=1)
    
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user_id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    
    assert progress is not None
    assert progress.is_completed is True
    assert progress.current_value == 1

@patch("app.services.notification_service.NotificationService.check_chat_member")
def test_viral_verify_channel_endpoint(mock_check, auth_client, test_db_session, test_user):
    """POST /api/viral/verify/channel 엔드포인트 동작 확인 (V2User/cc_id)"""
    mock_check.return_value = True
    
    # 1. 미션 생성 (JOIN_CHANNEL)
    mission = Mission(
        title="공식 채널 가입",
        logic_key="official_channel_join",
        action_type="JOIN_CHANNEL",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        category=MissionCategory.DAILY,
        is_active=True
    )
    test_db_session.add(mission)
    test_db_session.commit()
    
    # 2. API 호출
    response = auth_client.post(
        "/api/viral/verify/channel",
        json={"mission_id": mission.id}
    )
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # 3. 멱등성 확인
    response2 = auth_client.post(
        "/api/viral/verify/channel",
        json={"mission_id": mission.id}
    )
    assert response2.status_code == 200
    assert "이미 인증되었거나" in response2.json()["message"]

def test_viral_action_trust_based(auth_client, test_db_session, test_user):
    """POST /api/viral/action (신뢰 기반 공유) 동작 확인 (V2User/cc_id)"""
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
    assert response.json()["updated_count"] >= 1
    
    # 3. DB 확인
    progress = test_db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == test_user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    assert progress.is_completed is True
