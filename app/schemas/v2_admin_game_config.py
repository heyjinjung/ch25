"""Backward-compatible shim for v2 admin game config schemas."""
from app.v2.schemas.v2_admin_game_config import (  # noqa: F401
    AdminDiceConfigV2,
    AdminLotteryConfigV2,
    AdminLotteryPrizeV2,
    AdminRouletteConfigV2,
    AdminRouletteSegmentV2,
    RewardType,
    TicketType,
)

__all__ = [
    "TicketType",
    "RewardType",
    "AdminRouletteSegmentV2",
    "AdminRouletteConfigV2",
    "AdminDiceConfigV2",
    "AdminLotteryPrizeV2",
    "AdminLotteryConfigV2",
]
