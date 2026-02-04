"""V2 Ticket Zero eligibility service."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class TicketZeroEligibilityInput:
    point_balance: int
    ticket_balance: int
    has_pending_rewards: bool
    last_claimed_at: datetime | None
    now: datetime


class V2TicketZeroService:
    COOLDOWN_HOURS = 24

    @classmethod
    def is_eligible(cls, data: TicketZeroEligibilityInput) -> bool:
        if data.point_balance != 0:
            return False
        if data.ticket_balance != 0:
            return False
        if data.has_pending_rewards:
            return False
        if data.last_claimed_at is None:
            return True
        return data.now - data.last_claimed_at >= timedelta(hours=cls.COOLDOWN_HOURS)
