import pytest
from sqlalchemy import inspect
from app.v2.models.v2_ticket_conversion_policy import V2TicketConversionPolicy
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog

# Validates:
# - docs/v2_specs/04_db/v2_db_ticket_conversion_policy_ko.md
# - docs/v2_specs/04_db/v2_db_level_reward_table_ko.md
# - docs/v2_specs/04_db/v2_db_golden_data_map_ko.md

def test_v2_ticket_conversion_policy_table():
    insp = inspect(V2TicketConversionPolicy)
    cols = {c.name for c in insp.columns}
    assert "target_ticket_type" in cols
    assert "ratio_numerator" in cols

def test_v2_level_reward_table():
    insp = inspect(V2LevelRewardTable)
    cols = {c.name for c in insp.columns}
    assert "level" in cols
    assert "reward_type" in cols
    assert "reward_amount" in cols

def test_v2_golden_table():
    insp = inspect(V2GoldenInterventionLog)
    cols = {c.name for c in insp.columns}
    assert "user_id" in cols
    assert "trigger_id" in cols
    assert "action_taken" in cols
