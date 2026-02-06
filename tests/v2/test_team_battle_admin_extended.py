"""Team Battle Admin Extended Tests.

Coverage Targets:
- Team Battle Admin Service: Season Create / Force Join 1 case
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from sqlalchemy.orm import Session
from app.v2.services.team_battle_admin_service import TeamBattleAdminService
from app.v2.models import TeamSeason, Team, TeamMember, V2User

@pytest.fixture
def tb_admin_user(db: Session):
    user = V2User(cc_id="tb_admin_001", nickname="tb_admin", role="ADMIN")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def tb_target_user(db: Session):
    user = V2User(cc_id="tb_target_001", nickname="tb_target", role="USER")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

class TestTeamBattleAdminExtended:
    
    def test_create_season_success(self, db: Session, tb_admin_user):
        """Should create a new season successfully."""
        service = TeamBattleAdminService()
        
        now = datetime.utcnow()
        season = service.create_season(
            db,
            name="Test Season 1",
            starts_at=now,
            ends_at=now + timedelta(days=7),
            is_active=True,
            admin_id=tb_admin_user.id
        )
        
        assert season.id is not None
        assert season.name == "Test Season 1"
        assert season.is_active is True
        
        # Verify DB
        saved = db.query(TeamSeason).filter_by(id=season.id).first()
        assert saved is not None

    def test_force_join_team(self, db: Session, tb_admin_user, tb_target_user):
        """Should force join user to a team."""
        service = TeamBattleAdminService()
        
        # Create a team first
        team = Team(name="Force Team", is_active=True)
        db.add(team)
        db.commit()
        
        member = service.force_join_team(
            db,
            user_id=tb_target_user.id,
            team_id=team.id,
            admin_id=tb_admin_user.id,
            reason="Testing Force Join"
        )
        
        assert member.team_id == team.id
        assert member.user_id == tb_target_user.id
        
        # Verify DB
        saved_member = db.query(TeamMember).filter_by(user_id=tb_target_user.id).first()
        assert saved_member is not None
        assert saved_member.team_id == team.id
