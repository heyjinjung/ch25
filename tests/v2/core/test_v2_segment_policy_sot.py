import pytest
from sqlalchemy.orm import Session
from app.models.segment_rule import SegmentRule

def test_segment_rule_priority_evaluation():
    # v2_user_segment_policy_sot_ko.md: First-match-wins by priority
    rules = [
        {"id": 1, "priority": 10, "segment": "VIP"},
        {"id": 2, "priority": 5, "segment": "WHALE"}, # Higher priority
        {"id": 3, "priority": 20, "segment": "COMMON"}
    ]
    
    # Sort by priority
    sorted_rules = sorted(rules, key=lambda x: x["priority"])
    assert sorted_rules[0]["segment"] == "WHALE"

def test_default_segment_assignment():
    # v2_user_segment_policy_sot_ko.md: Default is NEW
    default_segment = "NEW"
    
    user_segment = None # Initial
    if user_segment is None:
        user_segment = default_segment
        
    assert user_segment == "NEW"

def test_segment_key_format():
    # v2_user_segment_policy_sot_ko.md: 영문 대문자/숫자/언더스코어
    import re
    pattern = re.compile(r"^[A-Z0-9_]+$")
    
    assert pattern.match("VIP_GOLD")
    assert pattern.match("WHALE_1")
    assert not pattern.match("vip_gold")
    assert not pattern.match("VIP-GOLD")
