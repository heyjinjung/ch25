
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.api.deps import get_db
from app.models.user import User
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.core.security import create_access_token
from app.services.mission_service import MissionService

def test_day2_login_mission_update():
    # Setup
    client = TestClient(app)
    
    # 1. Create a test user
    # We need to manually insert user to control state
    # But usually we use dependency override or just assume DB is clean or use a fresh user email
    
    # Using a helper to get DB session
    db = next(get_db())
    
    # Create unique user
    import uuid
    external_id = f"test_user_{uuid.uuid4()}"
    user = User(external_id=external_id, nickname="Tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 2. Create the "Day 2 Login" mission
    # Ensuring it matches the criteria: category=NEW_USER, action_type=LOGIN
    mission_logic_key = f"login_mission_{uuid.uuid4()}"
    mission = Mission(
        title="Day 2 Login Test",
        category=MissionCategory.NEW_USER,
        logic_key=mission_logic_key,
        action_type="LOGIN",
        target_value=2,
        reward_type=MissionRewardType.NONE,
        reward_amount=0,
        is_active=True
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    
    print(f"Created Mission: ID={mission.id}, Action={mission.action_type}")
    
    # 3. Simulate Login (Day 1)
    # We invoke the auth endpoint
    response = client.post("/api/auth/token", json={"external_id": external_id})
    assert response.status_code == 200
    
    # 4. Check Progress
    # Expectation: Progress should be 1 (if logic was present)
    progress = db.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    
    print(f"Progress after login: {progress.current_value if progress else 'None'}")
    
    if not progress:
        print("FAIL: No progress record created.")
    elif progress.current_value == 0:
        print("FAIL: Progress created but value is 0.")
    else:
        print(f"SUCCESS: Progress value is {progress.current_value}")

if __name__ == "__main__":
    try:
        test_day2_login_mission_update()
    except Exception as e:
        print(f"Test crashed: {e}")
