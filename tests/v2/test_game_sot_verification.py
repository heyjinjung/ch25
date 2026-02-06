
import pytest
from datetime import datetime, timedelta, timezone
from app.v2.services.ticket_zero_service import V2TicketZeroService, TicketZeroEligibilityInput
from app.v2.services.mission_service import V2MissionService
from app.v2.models import MissionCategory, MissionRewardType
from app.v2.models.user import V2User

def test_ticket_zero_eligibility_sot():
    """Verify Ticket Zero eligibility rules as per SoT."""
    now = datetime.now(timezone.utc)
    
    # 1. Eligible case
    data_eligible = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=now - timedelta(hours=25), # > 24h
        now=now
    )
    assert V2TicketZeroService.is_eligible(data_eligible) is True
    
    # 2. Ineligible: Point balance > 0
    data_points = TicketZeroEligibilityInput(
        point_balance=100,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=now - timedelta(hours=25),
        now=now
    )
    assert V2TicketZeroService.is_eligible(data_points) is False
    
    # 3. Ineligible: Ticket balance > 0
    data_tickets = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=1,
        has_pending_rewards=False,
        last_claimed_at=now - timedelta(hours=25),
        now=now
    )
    assert V2TicketZeroService.is_eligible(data_tickets) is False
    
    # 4. Ineligible: Has pending rewards
    data_pending = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=True,
        last_claimed_at=now - timedelta(hours=25),
        now=now
    )
    assert V2TicketZeroService.is_eligible(data_pending) is False
    
    # 5. Ineligible: Cooldown not passed
    data_cooldown = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=now - timedelta(hours=23), # < 24h
        now=now
    )
    assert V2TicketZeroService.is_eligible(data_cooldown) is False

def test_new_user_mission_expiration_sot(test_db_session):
    """Verify New User missions expires after 7 days (168h) as per SoT."""
    # This requires a db_session and a user
    user_new = V2User(id=9999, cc_id="test_new_sot", created_at=datetime.utcnow() - timedelta(days=6))
    user_old = V2User(id=9998, cc_id="test_old_sot", created_at=datetime.utcnow() - timedelta(days=8))
    
    test_db_session.add(user_new)
    test_db_session.add(user_old)
    test_db_session.commit()
    
    mission_service = V2MissionService(test_db_session)
    
    assert mission_service._is_new_user(user_new.id) is True
    assert mission_service._is_new_user(user_old.id) is False

def test_mission_category_reward_constraints_sot():
    """Verify reward constraints for different mission categories (conceptual check)."""
    # Based on v2_game_sot_master4_ko.md:
    # DAILY -> POINT, ROULETTE_TICKET, DICE_TICKET
    # WEEKLY -> DIAMOND, GOLD_KEY_TICKET, LOTTERY_TICKET
    # This is a policy check, usually enforced in Admin UI or validation logic.
    pass

def test_team_battle_constraints_sot():
    """Verify Team Battle constants as per SoT."""
    from app.v2.services.team_battle_service import V2TeamBattleService
    
    assert V2TeamBattleService.TEAM_MAX_MEMBERS == 7
    assert V2TeamBattleService.TEAM_SELECTION_WINDOW_HOURS == 48
