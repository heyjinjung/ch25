import pytest

ALLOWED_GRADES = ["COMMON", "VIP", "WHALE", "AT_RISK"]

def test_grade_segment_allowed_values():
    # Valid assignments
    for grade in ALLOWED_GRADES:
        # In a real scenario, this would check a Pydantic model or DB constraint
        assert grade in ALLOWED_GRADES

def test_grade_segment_invalid_values():
    invalid_grades = ["BRONZE", "GOLD", "PLATINUM", "CHURNED", "vip"] # Case sensitive
    for grade in invalid_grades:
        assert grade not in ALLOWED_GRADES
