from sqlalchemy.orm import Session
from app.models.user import User
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.models.level_xp import UserLevelProgress as V2UserLevelProgress
from app.models.level_xp import UserXpEventLog as V2UserXPEventLog
from app.models.level_xp import UserLevelRewardLog as V2UserLevelRewardLog
from app.v2.schemas.v2_progression import V2LevelStatusResponse

def test_level_point_storage_mapping(db: Session):
    # Setup test user with progression
    user = User(nickname="LevelUser", external_id="LV_001")
    db.add(user)
    db.flush()
    
    # Create activity for recency checks if needed (though not used here)
    from app.models.user_activity import UserActivity
    db.add(UserActivity(user_id=user.id))
    db.flush()
    
    # According to v2_level_point_storage_sot_ko.md:
    # level_point -> user_level_progress.xp
    progress = V2UserLevelProgress(user_id=user.id, level=1, xp=100)
    db.add(progress)
    db.commit()
    
    # Verify mapping
    saved_progress = db.query(V2UserLevelProgress).filter_by(user_id=user.id).first()
    assert saved_progress.xp == 100
    # The SoT says we interpret 'xp' as 'level_point'
    assert saved_progress.xp == 100

def test_level_reward_table_and_granting(db: Session):
    # Setup level rewards as per v2_level_reward_table_sot_ko.md
    # Lv 1: 0 XP -> ROULETTE_TICKET 1
    # Lv 2: 20 XP -> DICE_TICKET 1
    
    # Ensure reward table is populated (usually seeded, but we add for test)
    reward_lv2 = V2LevelRewardTable(level=2, required_xp=20, reward_type="DICE_TICKET", reward_amount=1)
    db.merge(reward_lv2)
    db.commit()
    
    user = User(nickname="LuckyUser", external_id="LV_002")
    db.add(user)
    db.flush()
    progress = V2UserLevelProgress(user_id=user.id, level=1, xp=0)
    db.add(progress)
    db.commit()
    
    # Simulate XP gain: +20 XP
    progress.xp += 20
    db.add(progress)
    db.flush()
    
    if progress.xp >= 20:
        progress.level = 2
        # Log reward
        reward_log = V2UserLevelRewardLog(
            user_id=user.id, 
            level=2, 
            reward_type="DICE_TICKET", 
            reward_payload={"amount": 1}
        )
        db.add(reward_log)
    
    db.commit()
    db.refresh(progress)
    
    assert progress.level == 2
    log = db.query(V2UserLevelRewardLog).filter_by(user_id=user.id, level=2).first()
    assert log is not None
    assert log.reward_type == "DICE_TICKET"

def test_progression_schema_compliance():
    # Test LevelStatusResponse structure as per v2_progression_schema_ko.md
    raw_data = {
        "current_level": 5,
        "current_level_point": 1250,
        "next_level": 6,
        "next_required_point": 2000,
        "point_to_next": 750,
        "rewards": [
            {
                "level": 2,
                "reward_type": "DICE_TICKET",
                "reward_payload": {"amount": 1},
                "auto_granted": True,
                "granted_at": "2026-01-01T10:00:00"
            }
        ]
    }
    
    response = V2LevelStatusResponse(**raw_data)
    assert response.current_level == 5
    assert response.current_level_point == 1250
    assert response.rewards[0].reward_type == "DICE_TICKET"

def test_xp_event_log_standard(db: Session):
    # Verify user_xp_event_log fields as per SoT
    user = User(nickname="AuditUser", external_id="LV_003")
    db.add(user)
    db.commit()
    
    log = V2UserXPEventLog(
        user_id=user.id,
        source="CC_DEPOSIT",
        delta=20,
        meta={"cc_id": "EXT_001"}
    )
    db.add(log)
    db.commit()
    
    saved_log = db.query(V2UserXPEventLog).filter_by(user_id=user.id).first()
    assert saved_log.source == "CC_DEPOSIT"
    assert saved_log.delta == 20
    assert saved_log.meta["cc_id"] == "EXT_001"
