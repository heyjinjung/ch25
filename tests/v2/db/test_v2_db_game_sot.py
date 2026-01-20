import pytest
from sqlalchemy import inspect
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteLog, V2RouletteSegment
from app.v2.models.v2_dice import V2DiceConfig, V2DiceLog
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryLog, V2LotteryPrize

# Validates:
# - docs/v2_specs/04_db/v2_db_roulette_ko.md
# - docs/v2_specs/04_db/v2_db_dice_ko.md
# - docs/v2_specs/04_db/v2_db_lottery_ko.md

def test_v2_roulette_tables():
    insp_config = inspect(V2RouletteConfig)
    cols_config = {c.name for c in insp_config.columns}
    assert "ticket_type" in cols_config
    assert "grade" in cols_config

    insp_log = inspect(V2RouletteLog)
    cols_log = {c.name for c in insp_log.columns}
    assert "user_id" in cols_log
    assert "config_id" in cols_log
    assert "reward_type" in cols_log
    assert "reward_amount" in cols_log

def test_v2_dice_tables():
    insp_config = inspect(V2DiceConfig)
    cols_config = {c.name for c in insp_config.columns}
    assert "win_reward_type" in cols_config
    
    insp_log = inspect(V2DiceLog)
    cols_log = {c.name for c in insp_log.columns}
    assert "user_dice_1" in cols_log
    assert "dealer_dice_1" in cols_log
    assert "result" in cols_log

def test_v2_lottery_tables():
    insp_config = inspect(V2LotteryConfig)
    cols_config = {c.name for c in insp_config.columns}
    assert "ticket_type" in cols_config
    
    insp_prize = inspect(V2LotteryPrize)
    cols_prize = {c.name for c in insp_prize.columns}
    assert "label" in cols_prize
    assert "reward_type" in cols_prize
    assert "weight" in cols_prize
    
    insp_log = inspect(V2LotteryLog)
    cols_log = {c.name for c in insp_log.columns}
    assert "user_id" in cols_log
    assert "prize_id" in cols_log
    assert "reward_amount" in cols_log
