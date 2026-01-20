import pytest
from pydantic import ValidationError
from app.v2.schemas.v2_ops_execution import OpsInventoryGrantAll, OpsGrantedItem

# Validates:
# - docs/v2_specs/05_ops/v2_ops_action_glossary_sot_ko.md
# - docs/v2_specs/05_ops/v2_ops_plan_execution_schema_sot_ko.md

def test_ops_inventory_grant_all_schema():
    """Verify INVENTORY_GRANT_ALL schema matches SoT structure."""
    valid_payload = {
        "kind": "INVENTORY_GRANT_ALL",
        "timestamp": 1234567890,
        "reason": "Compensation",
        "items": [
            {"item_type": "COIN", "amount": 100},
            {"item_type": "TICKET", "amount": 5}
        ],
        "target": "ALL_USERS",
        "granted_users": 100
    }
    obj = OpsInventoryGrantAll(**valid_payload)
    assert obj.items[0].item_type == "COIN"
    assert obj.items[0].amount == 100
    assert obj.kind == "INVENTORY_GRANT_ALL"

    # Negative Test 1: Invalid Kind
    invalid_payload = valid_payload.copy()
    invalid_payload["kind"] = "INVALID_KIND"
    with pytest.raises(ValidationError) as excinfo:
        OpsInventoryGrantAll(**invalid_payload)
    assert "Input should be 'INVENTORY_GRANT_ALL'" in str(excinfo.value)

    # Negative Test 2: Invalid Item (Missing Amount)
    invalid_item_payload = valid_payload.copy()
    invalid_item_payload["items"] = [{"item_type": "COIN"}] 
    with pytest.raises(ValidationError):
        OpsInventoryGrantAll(**invalid_item_payload)
