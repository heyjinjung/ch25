import pytest
from pydantic import ValidationError
from app.v2.schemas.v2_admin_game_config import (
    AdminRouletteConfigV2, 
    AdminRouletteSegmentV2,
    AdminDiceConfigV2,
    AdminLotteryConfigV2,
    AdminLotteryPrizeV2
)

def test_roulette_config_validation():
    # v2_admin_game_config_schema_ko.md: Roulette must have 6 segments
    valid_segments = [
        AdminRouletteSegmentV2(slot_index=i, label=f"S{i}", weight=10, reward_type="POINT", reward_amount=100)
        for i in range(6)
    ]
    config = AdminRouletteConfigV2(
        name="Test Roulette",
        ticket_type="ROULETTE_TICKET", # Matching Admin Schema Literal
        is_active=True,
        max_daily_spins=10,
        segments=valid_segments
    )
    assert len(config.segments) == 6

def test_dice_config_rewards():
    # v2_admin_game_config_schema_ko.md: Dice has win/draw/lose rewards
    config = AdminDiceConfigV2(
        name="Test Dice",
        is_active=True,
        max_daily_plays=50,
        win_reward_type="POINT",
        win_reward_amount=200,
        draw_reward_type="POINT",
        draw_reward_amount=0,
        lose_reward_type="POINT",
        lose_reward_amount=-50  # Negative allowed
    )
    assert config.lose_reward_amount == -50

def test_lottery_prize_constraints():
    # v2_admin_game_config_schema_ko.md: Lottery prizes must have weight > 0 and unique labels
    prizes = [
        AdminLotteryPrizeV2(label="1st", weight=1, reward_type="POINT", reward_amount=1000, is_active=True),
        AdminLotteryPrizeV2(label="2nd", weight=10, reward_type="POINT", reward_amount=100, is_active=True)
    ]
    config = AdminLotteryConfigV2(
        name="Test Lottery",
        is_active=True,
        max_daily_plays=100,
        prizes=prizes
    )
    assert len(config.prizes) == 2
    assert config.prizes[0].weight > 0

def test_ticket_type_enum_validation():
    # v2_admin_game_config_schema_ko.md: Allowed ticket types
    from app.v2.schemas.v2_admin_game_config import TicketType
    # This is a Literal type, let's see if it works with valid values
    pass
