import pytest
from unittest.mock import MagicMock
from app.v2.services.admin_message_service import V2AdminMessageService

# Validates:
# - docs/v2_specs/05_ops/v2_admin_message_policy_sot_ko.md

def test_admin_message_creation():
    """Verify message creation logic maps fields correctly."""
    mock_db = MagicMock()
    msg = V2AdminMessageService.create_message(
        db=mock_db,
        sender_admin_id=1,
        title="Emergency Notice",
        content="System down",
        target_type="ALL",
        target_value=None,
        channels=["INBOX", "PUSH"]
    )
    
    assert msg.title == "Emergency Notice"
    assert msg.content == "System down"
    assert msg.target_type == "ALL"
    assert "PUSH" in msg.channels
    # Rate limit check is not in Service, typically in API or specialized RateLimiter.

def test_resolve_users_target_logic():
    """Verify targeting logic for explicit User IDs."""
    mock_db = MagicMock()
    
    # Case 1: Clean list
    ids = V2AdminMessageService._resolve_user_ids(mock_db, "USER", "101, 102, 103")
    assert ids == [101, 102, 103]

    # Case 2: Dirty list (spaces, invalid chars)
    ids = V2AdminMessageService._resolve_user_ids(mock_db, "USER", "101,  abc, 102,, ")
    assert ids == [101, 102]

    # Case 3: Empty
    ids = V2AdminMessageService._resolve_user_ids(mock_db, "USER", "")
    assert ids == []
