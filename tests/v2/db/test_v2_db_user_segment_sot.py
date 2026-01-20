import pytest
from sqlalchemy import inspect
from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_segment_rule import V2SegmentRule

# Validates:
# - docs/v2_specs/04_db/v2_db_user_ko.md
# - docs/v2_specs/04_db/v2_db_user_segment_ko.md
# - docs/v2_specs/04_db/v2_db_segment_rule_ko.md

def test_v2_user_table_columns():
    """Verify V2User table structure matches SoT."""
    insp = inspect(V2User)
    cols = {c.name: c for c in insp.columns}
    
    # Core columns
    assert "id" in cols
    assert "cc_id" in cols
    assert "nickname" in cols
    assert "vault_locked_balance" in cols
    
    # Constraints
    assert cols["vault_locked_balance"].nullable is False
    assert cols["cc_id"].unique is True or any(c.name == "cc_id" for c in insp.unique_constraints) or any(idx.unique for idx in insp.indexes if "cc_id" in idx.columns)

def test_v2_user_segment_table_columns():
    """Verify V2UserSegment table structure."""
    insp = inspect(V2UserSegment)
    cols = {c.name: c for c in insp.columns}
    
    assert "user_id" in cols
    assert "segment" in cols # e.g. WHALE, COMMON
    assert "updated_at" in cols

def test_v2_segment_rule_table_columns():
    """Verify V2SegmentRule table structure."""
    insp = inspect(V2SegmentRule)
    cols = {c.name for c in insp.columns}
    
    assert "name" in cols
    assert "segment" in cols
    assert "condition_json" in cols
    assert "priority" in cols
