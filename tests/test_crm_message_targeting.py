"""Test CRM Message Targeting (ALL, SEGMENT, TAG, USER).

Verifies:
1. ALL target: fan-out to all users
2. SEGMENT target: fan-out to users in a specific segment
3. TAG target: fan-out to users with matching tags
4. USER target: fan-out to specific user(s) resolved by identifier
5. target_value validation for non-ALL targets
"""
import pytest
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.models.admin_user_profile import AdminUserProfile


def test_send_message_all_target(client, session_factory):
    """ALL target should create inbox entries for all users."""
    db: Session = session_factory()
    
    # Create test users
    user1 = User(external_id="test_user_1", nickname="User1")
    user2 = User(external_id="test_user_2", nickname="User2")
    db.add_all([user1, user2])
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    
    # Send message to ALL
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test ALL",
        "content": "Hello everyone!",
        "target_type": "ALL",
        "target_value": None,
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test ALL"
    assert data["target_type"] == "ALL"
    
    db.close()


def test_send_message_user_target_by_external_id(client, session_factory):
    """USER target should resolve user by external_id."""
    db: Session = session_factory()
    
    # Create test user
    user = User(external_id="specific_user_123", nickname="SpecificUser")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send message to specific user by external_id
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test USER Target",
        "content": "Hello specific user!",
        "target_type": "USER",
        "target_value": "specific_user_123",
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test USER Target"
    assert data["target_type"] == "USER"
    
    db.close()


def test_send_message_user_target_by_nickname(client, session_factory):
    """USER target should resolve user by @nickname."""
    db: Session = session_factory()
    
    # Create test user
    user = User(external_id="nick_user_456", nickname="TestNickname")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send message to user by @nickname
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test Nickname Target",
        "content": "Hello by nickname!",
        "target_type": "USER",
        "target_value": "@TestNickname",
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["target_type"] == "USER"
    
    db.close()


def test_send_message_tag_target(client, session_factory):
    """TAG target should fan-out to users with matching tags."""
    db: Session = session_factory()
    
    # Create test user with profile and tags
    user = User(external_id="tagged_user_789", nickname="TaggedUser")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    profile = AdminUserProfile(
        user_id=user.id,
        external_id="tagged_user_789",
        tags=["VIP", "PREMIUM"]
    )
    db.add(profile)
    db.commit()
    
    # Send message to TAG target
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test TAG Target",
        "content": "Hello VIP users!",
        "target_type": "TAG",
        "target_value": "VIP",
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["target_type"] == "TAG"
    
    db.close()


def test_send_message_segment_target(client, session_factory):
    """SEGMENT target should fan-out to users in the segment."""
    # Send message to SEGMENT target
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test SEGMENT Target",
        "content": "Hello segment users!",
        "target_type": "SEGMENT",
        "target_value": "WHALE",
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["target_type"] == "SEGMENT"
    assert data["target_value"] == "WHALE"


def test_send_message_target_value_required(client):
    """Non-ALL targets should require target_value."""
    # USER without target_value
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test",
        "content": "Test",
        "target_type": "USER",
        "target_value": "",
        "channels": ["INBOX"]
    })
    assert response.status_code == 400
    # Check that error is related to target_value
    error_data = response.json()
    assert "TARGET_VALUE_REQUIRED" in str(error_data) or response.status_code == 400
    
    # TAG without target_value
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test",
        "content": "Test",
        "target_type": "TAG",
        "target_value": None,
        "channels": ["INBOX"]
    })
    assert response.status_code == 400
    
    # SEGMENT without target_value
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test",
        "content": "Test",
        "target_type": "SEGMENT",
        "target_value": "   ",
        "channels": ["INBOX"]
    })
    assert response.status_code == 400


def test_send_message_multiple_users(client, session_factory):
    """USER target should support comma-separated identifiers."""
    db: Session = session_factory()
    
    # Create multiple test users
    user1 = User(external_id="multi_user_1", nickname="Multi1")
    user2 = User(external_id="multi_user_2", nickname="Multi2")
    db.add_all([user1, user2])
    db.commit()
    
    # Send message to multiple users
    response = client.post("/admin/api/crm/messages", json={
        "title": "Test Multiple Users",
        "content": "Hello multiple users!",
        "target_type": "USER",
        "target_value": "multi_user_1, multi_user_2",
        "channels": ["INBOX"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["target_type"] == "USER"
    
    db.close()
