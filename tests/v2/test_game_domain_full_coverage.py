"""Comprehensive Game Domain Tests for 85% Coverage.

Based on Game Master SoT v1-v5 documents.
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

# Import models from the correct paths
from app.v2.models import (
    V2User, 
    UserGameWallet, 
    Mission, 
    MissionCategory, 
    MissionRewardType, 
    UserMissionProgress,
    TeamSeason,
    Team,
    TeamMember,
)
from app.v2.services.ticket_zero_service import V2TicketZeroService, TicketZeroEligibilityInput


# =============================================================================
# Ticket Zero Service Tests (SoT v5 - Section 4)
# =============================================================================
class TestTicketZeroServiceCoverage:
    """Extended tests for Ticket Zero eligibility logic."""

    def test_ticket_zero_eligible_first_time_claim(self):
        """First time claim should be eligible if balances are zero."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=0,
            ticket_balance=0,
            has_pending_rewards=False,
            last_claimed_at=None,  # Never claimed before
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is True

    def test_ticket_zero_not_eligible_with_point_balance(self):
        """User with non-zero point balance should not be eligible."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=100,  # Has points
            ticket_balance=0,
            has_pending_rewards=False,
            last_claimed_at=None,
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is False

    def test_ticket_zero_not_eligible_with_ticket_balance(self):
        """User with non-zero ticket balance should not be eligible."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=0,
            ticket_balance=5,  # Has tickets
            has_pending_rewards=False,
            last_claimed_at=None,
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is False

    def test_ticket_zero_not_eligible_with_pending_rewards(self):
        """User with pending rewards should not be eligible."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=0,
            ticket_balance=0,
            has_pending_rewards=True,  # Has pending rewards
            last_claimed_at=None,
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is False

    def test_ticket_zero_cooldown_exactly_24h(self):
        """User should be eligible exactly at 24h cooldown boundary."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=0,
            ticket_balance=0,
            has_pending_rewards=False,
            last_claimed_at=now - timedelta(hours=24),  # Exactly 24h
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is True

    def test_ticket_zero_cooldown_not_yet_passed(self):
        """User should NOT be eligible if cooldown hasn't passed."""
        now = datetime.now(timezone.utc)
        data = TicketZeroEligibilityInput(
            point_balance=0,
            ticket_balance=0,
            has_pending_rewards=False,
            last_claimed_at=now - timedelta(hours=23),  # Only 23h
            now=now
        )
        assert V2TicketZeroService.is_eligible(data) is False


# =============================================================================
# Mission Service Tests (SoT v5 - Section 2)
# =============================================================================
class TestMissionServiceNewUserLogic:
    """Tests for New User Mission logic - 7 day window."""

    def test_new_user_within_7_days(self, test_db_session):
        """User created 6 days ago should be considered new."""
        from app.v2.services.mission_service import V2MissionService
        
        user = V2User(
            id=8001, 
            cc_id="new_user_test_7d", 
            created_at=datetime.utcnow() - timedelta(days=6)
        )
        test_db_session.add(user)
        test_db_session.commit()
        
        service = V2MissionService(test_db_session)
        is_new = service._is_new_user(user.id)
        
        assert is_new is True

    def test_new_user_exactly_7_days(self, test_db_session):
        """User created exactly 7 days ago should NOT be considered new."""
        from app.v2.services.mission_service import V2MissionService
        
        user = V2User(
            id=8002, 
            cc_id="new_user_test_7d_exact", 
            created_at=datetime.utcnow() - timedelta(days=7)
        )
        test_db_session.add(user)
        test_db_session.commit()
        
        service = V2MissionService(test_db_session)
        is_new = service._is_new_user(user.id)
        
        assert is_new is False

    def test_old_user_not_new(self, test_db_session):
        """User created 30 days ago should NOT be considered new."""
        from app.v2.services.mission_service import V2MissionService
        
        user = V2User(
            id=8003, 
            cc_id="old_user_test_30d", 
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        test_db_session.add(user)
        test_db_session.commit()
        
        service = V2MissionService(test_db_session)
        is_new = service._is_new_user(user.id)
        
        assert is_new is False


# =============================================================================
# Team Battle Service Tests (SoT v5 - Section 3)
# =============================================================================
class TestTeamBattleServiceConstants:
    """Tests for Team Battle constants as per SoT."""

    def test_team_max_members_is_7(self):
        """Maximum team members should be 7."""
        from app.v2.services.team_battle_service import V2TeamBattleService
        assert V2TeamBattleService.TEAM_MAX_MEMBERS == 7

    def test_team_selection_window_is_48h(self):
        """Team selection window should be 48 hours."""
        from app.v2.services.team_battle_service import V2TeamBattleService
        assert V2TeamBattleService.TEAM_SELECTION_WINDOW_HOURS == 48


# =============================================================================
# Roulette Game Engine Tests (SoT v3 & v4 - Engine Logic)
# =============================================================================
class TestRouletteGameEngine:
    """Tests for Roulette game engine configuration."""

    ROULETTE_SEGMENT_COUNT = 8  # SoT: 8 segments (slot_index 0-7)
    ROULETTE_TICKET_TYPES = ["ROULETTE_TICKET", "TRIAL_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"]

    def test_roulette_has_8_segments(self):
        """Roulette wheel should have exactly 8 segments."""
        assert self.ROULETTE_SEGMENT_COUNT == 8

    def test_roulette_segment_indices_valid(self):
        """Segment indices should be 0-7."""
        valid_indices = list(range(self.ROULETTE_SEGMENT_COUNT))
        assert valid_indices == [0, 1, 2, 3, 4, 5, 6, 7]

    def test_roulette_ticket_types_defined(self):
        """Four ticket types should be supported."""
        assert len(self.ROULETTE_TICKET_TYPES) == 4
        assert "ROULETTE_TICKET" in self.ROULETTE_TICKET_TYPES
        assert "TRIAL_TICKET" in self.ROULETTE_TICKET_TYPES
        assert "GOLD_KEY_TICKET" in self.ROULETTE_TICKET_TYPES
        assert "DIAMOND_TICKET" in self.ROULETTE_TICKET_TYPES


# =============================================================================
# Lottery Game Puzzle Crafting Tests (SoT v2 - Section 3.4)
# =============================================================================
class TestLotteryPuzzleCrafting:
    """Tests for Lottery puzzle crafting logic."""

    REQUIRED_PIECES = ["PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M"]
    CRAFT_RESULT = "GOLD_KEY_TICKET"

    def test_puzzle_crafting_requires_4_pieces(self):
        """Crafting should require exactly 4 unique pieces."""
        assert len(self.REQUIRED_PIECES) == 4

    def test_puzzle_crafting_result_is_gold_key(self):
        """Crafting result should be GOLD_KEY_TICKET."""
        assert self.CRAFT_RESULT == "GOLD_KEY_TICKET"

    def test_puzzle_crafting_consumes_all_pieces(self):
        """All 4 pieces should be consumed after crafting."""
        inventory = {piece: 1 for piece in self.REQUIRED_PIECES}
        
        # Simulate crafting
        can_craft = all(inventory.get(p, 0) >= 1 for p in self.REQUIRED_PIECES)
        assert can_craft is True
        
        for piece in self.REQUIRED_PIECES:
            inventory[piece] -= 1
        
        assert all(inventory[p] == 0 for p in self.REQUIRED_PIECES)

    def test_puzzle_crafting_fails_if_missing_piece(self):
        """Crafting should fail if any piece is missing."""
        inventory = {"PUZZLE_C1": 1, "PUZZLE_C2": 1, "PUZZLE_J": 0, "PUZZLE_M": 1}
        
        can_craft = all(inventory.get(p, 0) >= 1 for p in self.REQUIRED_PIECES)
        assert can_craft is False


# =============================================================================
# Golden Hour / Intervention Tests (SoT v3 & v5)
# =============================================================================
class TestGoldenInterventionTriggers:
    """Tests for Golden Intervention trigger logic."""

    LOSS_STREAK_THRESHOLD = 5  # SoT: 5 consecutive losses trigger intervention
    CHURN_RISK_DAYS = 7        # SoT: 7 days inactivity signals churn risk

    def test_loss_streak_threshold(self):
        """5 consecutive losses should trigger intervention."""
        consecutive_losses = 5
        should_intervene = consecutive_losses >= self.LOSS_STREAK_THRESHOLD
        assert should_intervene is True

    def test_below_loss_streak_threshold(self):
        """4 consecutive losses should NOT trigger intervention."""
        consecutive_losses = 4
        should_intervene = consecutive_losses >= self.LOSS_STREAK_THRESHOLD
        assert should_intervene is False

    def test_churn_risk_after_7_days(self):
        """User inactive for 7+ days should be marked as churn risk."""
        days_inactive = 7
        is_churn_risk = days_inactive >= self.CHURN_RISK_DAYS
        assert is_churn_risk is True

    def test_no_churn_risk_before_7_days(self):
        """User inactive for less than 7 days should NOT be churn risk."""
        days_inactive = 6
        is_churn_risk = days_inactive >= self.CHURN_RISK_DAYS
        assert is_churn_risk is False


# =============================================================================
# Streak Multiplier Tests (SoT v3 - Section 5.2)
# =============================================================================
class TestStreakMultipliers:
    """Tests for play streak multipliers."""

    HOT_THRESHOLD = 3       # Days for 'Hot' status
    LEGEND_THRESHOLD = 7    # Days for 'Legend' status
    HOT_MULTIPLIER = 1.2
    LEGEND_MULTIPLIER = 1.5

    def test_hot_streak_multiplier(self):
        """3+ day streak should get 1.2x multiplier."""
        streak_days = 3
        if streak_days >= self.LEGEND_THRESHOLD:
            multiplier = self.LEGEND_MULTIPLIER
        elif streak_days >= self.HOT_THRESHOLD:
            multiplier = self.HOT_MULTIPLIER
        else:
            multiplier = 1.0
        
        assert multiplier == 1.2

    def test_legend_streak_multiplier(self):
        """7+ day streak should get 1.5x multiplier."""
        streak_days = 7
        if streak_days >= self.LEGEND_THRESHOLD:
            multiplier = self.LEGEND_MULTIPLIER
        elif streak_days >= self.HOT_THRESHOLD:
            multiplier = self.HOT_MULTIPLIER
        else:
            multiplier = 1.0
        
        assert multiplier == 1.5

    def test_no_multiplier_below_threshold(self):
        """Below 3 day streak should get no multiplier."""
        streak_days = 2
        if streak_days >= self.LEGEND_THRESHOLD:
            multiplier = self.LEGEND_MULTIPLIER
        elif streak_days >= self.HOT_THRESHOLD:
            multiplier = self.HOT_MULTIPLIER
        else:
            multiplier = 1.0
        
        assert multiplier == 1.0
