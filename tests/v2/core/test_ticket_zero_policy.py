"""TDD: V2 Ticket Zero eligibility policy."""
from datetime import datetime, timedelta

from app.v2.services.ticket_zero_service import TicketZeroEligibilityInput, V2TicketZeroService


def test_ticket_zero_eligible_when_all_conditions_met():
    now = datetime(2026, 1, 19, 12, 0, 0)
    data = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=None,
        now=now,
    )
    assert V2TicketZeroService.is_eligible(data) is True


def test_ticket_zero_ineligible_when_balance_nonzero():
    now = datetime(2026, 1, 19, 12, 0, 0)
    data = TicketZeroEligibilityInput(
        point_balance=1,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=None,
        now=now,
    )
    assert V2TicketZeroService.is_eligible(data) is False


def test_ticket_zero_ineligible_when_pending_rewards():
    now = datetime(2026, 1, 19, 12, 0, 0)
    data = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=True,
        last_claimed_at=None,
        now=now,
    )
    assert V2TicketZeroService.is_eligible(data) is False


def test_ticket_zero_ineligible_when_cooldown_not_elapsed():
    now = datetime(2026, 1, 19, 12, 0, 0)
    data = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=now - timedelta(hours=23, minutes=59),
        now=now,
    )
    assert V2TicketZeroService.is_eligible(data) is False
