
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from app.v2.models import Team, TeamSeason, V2User, UserGameWallet, Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.v2.services.v2_roulette_game_service import V2RouletteGameService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.v2_lottery_game_service import V2LotteryGameService
from app.v2.services.mission_service import V2MissionService
from app.v2.services.team_battle_service import V2TeamBattleService
from app.v2.services.game_common import GameCommon
from app.v2.services.ticket_zero_service import V2TicketZeroService, TicketZeroEligibilityInput

@pytest.fixture
def mock_user(test_db_session: Session):
    user = V2User(id=1001, cc_id="test_user_coverage", vault_locked_balance=10000)
    test_db_session.add(user)
    test_db_session.commit()
    return user

@pytest.fixture
def mock_wallet(test_db_session: Session, mock_user):
    wallet = UserGameWallet(user_id=mock_user.id, ticket_type="ROULETTE_TICKET", balance=10)
    test_db_session.add(wallet)
    wallet2 = UserGameWallet(user_id=mock_user.id, ticket_type="DICE_TICKET", balance=10)
    test_db_session.add(wallet2)
    wallet3 = UserGameWallet(user_id=mock_user.id, ticket_type="LOTTERY_TICKET", balance=10)
    test_db_session.add(wallet3)
    test_db_session.commit()
    return [wallet, wallet2, wallet3]

class TestGameServicesCoverage:
    def test_roulette_play_full_flow(self, test_db_session, mock_user, mock_wallet):
        service = V2RouletteGameService(test_db_session)
        # Mock dependencies to avoid complex setup
        service.vault_service = MagicMock()
        service.reward_service = MagicMock()
        
        # Test playing
        result = service.play(user_id=mock_user.id, ticket_type="ROULETTE_TICKET")
        
        assert "result" in result
        assert "game_data" in result
        assert "vault_earn" in result
        assert result["result"] == "SUCCESS"
        
        # Verify wallet balance decreased
        wallet = test_db_session.query(UserGameWallet).filter_by(user_id=mock_user.id, ticket_type="ROULETTE_TICKET").first()
        assert wallet.balance == 9

    def test_dice_play_full_flow(self, test_db_session, mock_user, mock_wallet):
        service = V2DiceGameService(test_db_session)
        service.vault_service = MagicMock()
        service.reward_service = MagicMock()
        
        result = service.play(user_id=mock_user.id, ticket_type="DICE_TICKET")
        assert result["result"] == "SUCCESS"
        
        wallet = test_db_session.query(UserGameWallet).filter_by(user_id=mock_user.id, ticket_type="DICE_TICKET").first()
        assert wallet.balance == 9

    def test_lottery_play_full_flow(self, test_db_session, mock_user, mock_wallet):
        service = V2LotteryGameService(test_db_session)
        service.vault_service = MagicMock()
        service.reward_service = MagicMock()
        
        result = service.play(user_id=mock_user.id, ticket_type="LOTTERY_TICKET")
        assert result["result"] == "SUCCESS"
        
        wallet = test_db_session.query(UserGameWallet).filter_by(user_id=mock_user.id, ticket_type="LOTTERY_TICKET").first()
        assert wallet.balance == 9

    def test_game_common_utils(self):
        # Coverage for game_common.py
        assert GameCommon.is_valid_ticket_type("ROULETTE_TICKET") is True
        assert GameCommon.is_valid_ticket_type("INVALID") is False
        
        # Test multiplier logic (if any)
        assert GameCommon.calculate_payout(100, 2.0) == 200

class TestMissionServiceCoverage:
    def test_mission_progress_update(self, test_db_session, mock_user):
        # Create a mission
        mission = Mission(
            title="Play Roulette",
            action_type="ROULETTE_PLAY",
            target_value=3,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
            category=MissionCategory.DAILY,
            auto_claim=True
        )
        test_db_session.add(mission)
        test_db_session.commit()
        
        service = V2MissionService(test_db_session)
        
        # Update progress
        service.update_progress(mock_user.id, "ROULETTE_PLAY", delta=1)
        
        progress = test_db_session.query(UserMissionProgress).filter_by(user_id=mock_user.id, mission_id=mission.id).first()
        assert progress.current_value == 1
        assert progress.is_completed is False
        
        # Complete mission
        service.update_progress(mock_user.id, "ROULETTE_PLAY", delta=2)
        test_db_session.refresh(progress)
        assert progress.current_value == 3
        assert progress.is_completed is True

    def test_streak_logic(self, test_db_session, mock_user):
        service = V2MissionService(test_db_session)
        now = datetime.now(timezone.utc)
        
        # Set initial streak
        mock_user.play_streak = 2
        mock_user.last_play_date = (now - timedelta(days=1)).date()
        test_db_session.commit()
        
        # Sync streak (next day)
        updated_user = service.sync_play_streak(mock_user.id, now)
        assert updated_user.play_streak == 3
        
        # Test multiplier
        assert service._get_streak_multiplier(3) == 1.2 # Hot threshold

class TestTeamBattleServiceCoverage:
    def test_team_battle_flow(self, test_db_session, mock_user):
        service = V2TeamBattleService()
        
        # Create a season
        now = datetime.utcnow()
        season = TeamSeason(
            id=1,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=1),
            is_active=True
        )
        test_db_session.add(season)
        
        # Create a team
        team = Team(id=1, name="Alpha Team", is_active=True)
        test_db_session.add(team)
        test_db_session.commit()
        
        # Join team
        member = service.join_team(test_db_session, team_id=team.id, user_id=mock_user.id)
        assert member.team_id == team.id
        
        # Leave team (within window)
        service.leave_team(test_db_session, user_id=mock_user.id, now=now)
        exists = service.get_membership(test_db_session, mock_user.id)
        assert exists is None
