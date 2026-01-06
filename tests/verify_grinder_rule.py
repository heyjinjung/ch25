
import pytest
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from app.models.user import User
from app.api.routes.auth import issue_token, TokenRequest
from fastapi import Request
from unittest.mock import MagicMock
from app.services.team_battle_service import TeamBattleService
from app.services.mission_service import MissionService
from app.models.team_battle import Team, TeamMember, TeamSeason, TeamScore, TeamEventLog
from app.models.mission import Mission, UserMissionProgress as UserMission, MissionCategory, MissionRewardType
from app.core.config import get_settings

@pytest.fixture
def mock_request():
    req = MagicMock(spec=Request)
    req.client.host = "127.0.0.1"
    return req

def test_grinder_rule_flow(session_factory, mock_request):
    """
    Test Grinder Rule:
    1. Login Streak increment
    2. Streak Bonus (3 days)
    3. Mission All Clear Bonus
    """
    with session_factory() as db:
        # Setup
        settings = get_settings()
        kst = ZoneInfo(settings.timezone)
        now_kst = datetime.now(kst)
        today = now_kst.date()
        
        # Create valid yesterday UTC timestamp for simulation
        # We want last_streak_updated_at to be "Yesterday in KST"
        # So if we convert it to KST, it should be yesterday's date.
        yesterday_kst = now_kst - timedelta(days=1)
        # Convert this KST time to UTC naive for DB storage
        yesterday_utc = yesterday_kst.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

        # Create User
        user = User(
            external_id="grinder_test_user",
            nickname="Grinder",
            status="ACTIVE",
            # Simulate login yesterday
            last_streak_updated_at=yesterday_utc, 
            login_streak=2 # If they login today, it should become 3
        )
        db.add(user)
        db.flush() # get ID

        # Create Team Season & Team
        season = TeamSeason(name="Test Season", starts_at=datetime.utcnow() - timedelta(days=1), ends_at=datetime.utcnow() + timedelta(days=10), is_active=True)
        db.add(season)
        team = Team(name="Grinders Team", is_active=True)
        db.add(team)
        db.flush()
        
        # Join Team
        svc = TeamBattleService()
        svc.join_team(db, team.id, user.id, bypass_selection=True)

        # 1. Test Login Streak & Bonus
        req = TokenRequest(user_id=user.id)
        print(f"DEBUG: Yesterday UTC (Simulated): {yesterday_utc}")
        print(f"DEBUG: Pre-login Last Update: {user.last_streak_updated_at}")
        
        issue_token(req, mock_request, db)
        db.refresh(user)

        print(f"DEBUG: Post-login Last Update: {user.last_streak_updated_at}")
        print(f"DEBUG: Login Streak: {user.login_streak}")

        assert user.login_streak == 3, f"Streak should increment to 3, but got {user.login_streak}"
        
        # Verify Streak Bonus
        # We expect +10 points for 3-day streak
        bonus_log = db.query(TeamEventLog).filter(
            TeamEventLog.user_id == user.id,
            TeamEventLog.action == "STREAK_BONUS"
        ).first()
        
        assert bonus_log is not None, "Streak bonus log should exist"
        assert bonus_log.delta == 10, "3-day streak bonus should be 10"

        # 2. Test Mission All Clear
        # Create a daily mission
        mission = Mission(
            title="Daily Test",
            category=MissionCategory.DAILY,
            is_active=True,
            logic_key="test_daily",
            action_type="TEST",
            target_value=1,
            reward_type=MissionRewardType.DIAMOND,
            reward_amount=1
        )
        db.add(mission)
        db.flush()
        
        # Complete mission
        # Complete mission
        # Fix: reset_date is a String column, so we must provide string.
        msvc = MissionService(db)
        op_today = msvc._operational_play_date(msvc._now_tz())
        reset_date_str = op_today.isoformat()
        
        print(f"DEBUG: Setting reset_date to {reset_date_str}")
        
        um = UserMission(
            user_id=user.id,
            mission_id=mission.id,
            current_value=1,
            is_completed=True,
            reset_date=reset_date_str 
        )
        
        db.add(um)
        db.commit()

        # Claim Reward -> Triggers All Clear Check
        print("DEBUG: Claiming Reward...")
        msvc.claim_reward(user.id, mission.id)
        
        # Verify All Clear Bonus
        # We expect +50 points
        clear_log = db.query(TeamEventLog).filter(
            TeamEventLog.user_id == user.id,
            TeamEventLog.action == "MISSION_ALL_CLEAR"
        ).first()
        
        assert clear_log is not None, "All Clear bonus log should exist"
        assert clear_log.delta == 50, "All Clear bonus should be 50"

    # Create ExternalRankingData to satisfy usage check
    from app.models.external_ranking import ExternalRankingData
    
    ranking_data = ExternalRankingData(
        user_id=user.id,
        deposit_amount=100000,
        play_count=100,
        daily_base_deposit=0,
        daily_base_play=0,
        updated_at=datetime.utcnow()
    )
    db.add(ranking_data)
    db.commit()

    # 3. Test Gameplay Point Cap
    # Points per play should be 1
    # We expect 100 points cap.
    
    # First, verify usage check passes
    svc.add_points(db, team.id, 999, "GAME_PLAY", user.id, season.id, None) 
    
    score_before = db.query(TeamScore).filter_by(team_id=team.id, season_id=season.id).first().points
    svc.add_points(db, team.id, 1, "GAME_PLAY", user.id, season.id, None)
    score_after = db.query(TeamScore).filter_by(team_id=team.id, season_id=season.id).first().points
    
    assert score_after - score_before == 1, "Game play should grant 1 point"

