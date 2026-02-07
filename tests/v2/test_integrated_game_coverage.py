import pytest
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status

from app.v2.models import (
    V2User, User, GameTokenType, UserGameWallet, 
    TeamSeason, Team, TeamMember, TeamScore,
    V2RouletteConfig, V2RouletteSegment, V2RouletteLog,
    V2DiceConfig, UserGameWalletLedger, UserSegment
)
from app.v2.services.v2_roulette_game_service import V2RouletteGameService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.team_battle_service import V2TeamBattleService
from app.v2.services.game_common import GameCommonService

_KST = ZoneInfo("Asia/Seoul")

@pytest.fixture
def integrated_user(test_db_session):
    uid = 8001
    v1 = User(id=uid, external_id="integrated_test_user_v1")
    v2 = V2User(id=uid, cc_id="integrated_test_user", created_at=datetime.now(timezone.utc) - timedelta(days=1))
    test_db_session.add(v1)
    test_db_session.add(v2)
    test_db_session.commit()
    return v2

@pytest.fixture
def active_team_season(test_db_session):
    now = datetime.utcnow()
    season = TeamSeason(
        id=801,
        name="Integrated Test Season",
        starts_at=now - timedelta(hours=1),
        ends_at=now + timedelta(days=7),
        is_active=True
    )
    test_db_session.add(season)
    test_db_session.commit()
    return season

@pytest.fixture
def alpha_team(test_db_session):
    team = Team(id=851, name="Alpha Team", is_active=True)
    test_db_session.add(team)
    test_db_session.commit()
    return team

class TestIntegratedGameCoverage:
    """Integrated tests for Game Token, Troubleshooting, and Team Battle."""

    def test_scenario_1_token_alias_compatibility(self, test_db_session, integrated_user):
        """FE Legacy name 'GOLD_KEY' should work with BE 'GOLD_KEY_TICKET'."""
        # Setup: Add GOLD_KEY_TICKET to wallet
        wallet = UserGameWallet(user_id=integrated_user.id, token_type=GameTokenType.GOLD_KEY_TICKET, balance=1)
        test_db_session.add(wallet)
        test_db_session.commit()

        # Setup: Create Roulette Config for GOLD_KEY_TICKET
        config = V2RouletteConfig(name="GOLD_ROULETTE", ticket_type="GOLD_KEY_TICKET", is_active=True, grade="VIP")
        test_db_session.add(config)
        test_db_session.flush()
        
        for i in range(8):
            seg = V2RouletteSegment(config_id=config.id, slot_index=i, label=f"P{i}", reward_type="POINT", reward_amount=100, weight=1)
            test_db_session.add(seg)
        test_db_session.commit()

        # Action: Play with 'GOLD_KEY' (Legacy)
        service = V2RouletteGameService()
        # Mocking the ticket conversion or ensuring service handles it
        # Based on Troubleshooting SOT, BE handles aliases
        res = service.play(test_db_session, user_id=integrated_user.id, ticket_type="GOLD_KEY")
        
        assert res.result == "OK"
        test_db_session.refresh(wallet)
        assert wallet.balance == 0
        
        # Verify Ledger
        ledger = test_db_session.query(UserGameWalletLedger).filter_by(user_id=integrated_user.id, token_type="GOLD_KEY_TICKET").first()
        assert ledger is not None
        assert ledger.delta == -1

    def test_scenario_2_premium_access_control(self, test_db_session, integrated_user):
        """COMMON user should be blocked from GOLD_KEY_TICKET roulette."""
        pytest.skip("Grade/Vip check is deprecated in V2 (2026-01)")

    def test_scenario_4_team_battle_scoring_integration(self, test_db_session, integrated_user, active_team_season, alpha_team):
        """Game play should automatically add points to team battle."""
        # Setup: Join Team
        tb_service = V2TeamBattleService()
        tb_service.join_team(test_db_session, team_id=alpha_team.id, user_id=integrated_user.id, bypass_selection=True)
        
        # Setup: Add Dice Config
        dice_config = V2DiceConfig(id=801, name="Integrated Test Dice", is_active=True)
        test_db_session.add(dice_config)
        wallet = UserGameWallet(user_id=integrated_user.id, token_type=GameTokenType.DICE_TICKET, balance=1)
        test_db_session.add(wallet)
        test_db_session.commit()

        # Action: Play Dice
        dice_service = V2DiceGameService()
        # Action: Play Dice
        dice_service = V2DiceGameService()
        res = dice_service.play(test_db_session, user_id=integrated_user.id)
        # Service returns OK, actual result is in outcome
        assert res.result == "OK"
        # outcome is inside game_data
        assert res.game_data.outcome in ["WIN", "LOSE", "DRAW"]

        # Verify: Team Score should be updated
        score = test_db_session.query(TeamScore).filter_by(team_id=alpha_team.id, season_id=active_team_season.id).first()
        # POINTS_PER_PLAY is usually 5
        assert score is not None
        assert score.points >= 5

    def test_scenario_golden_hour_boost(self, test_db_session, integrated_user):
        """Golden Hour should multiply point rewards."""
        from app.v2.services.ui_config_service import UiConfigService
        # Setup: Golden Hour ON (Manual Override)
        UiConfigService.upsert(test_db_session, "golden_hour_config", {"manual_override": "FORCE_ON", "multiplier": 2.0})
        
        # Setup: Mock Reward Service or just check behavior in common service
        # In a real integration, we'd play a game and check vault_earn
        # For now, verify multiplier logic directly via GameCommonService
        common_svc = GameCommonService(test_db_session)
        base_points = 100
        boosted = common_svc.apply_golden_hour_boost(base_points)
        assert boosted == 200
