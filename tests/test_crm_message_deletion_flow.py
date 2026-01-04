import pytest
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.api.deps import get_db

from app.api.admin.routes.admin_crm import fan_out_message

def test_crm_message_deletion_flow(client, session_factory):
    """
    Verify full flow:
    1. Send message to ALL
    2. Verify user sees it in inbox
    3. Admin deletes (recalls) message
    4. Verify user NO LONGER sees it in inbox
    5. Verify Admin list still shows it (marked deleted)
    """
    db: Session = session_factory()
    
    # 1. Setup User
    user = User(external_id="test_recall_user", nickname="RecallUser")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 2. Admin sends message
    resp = client.post("/admin/api/crm/messages", json={
        "title": "To be recalled",
        "content": "This message will self-destruct.",
        "target_type": "ALL",
        "target_value": "",
        "channels": ["INBOX"]
    })
    assert resp.status_code == 200
    msg_id = resp.json()["id"]
    
    # FORCE FAN-OUT (since background tasks might not run in test client automatically or race condition)
    fan_out_message(msg_id, "ALL", "", None, db=db)
    
    # 3. Verify Inbox (User side perspective)
    # Mock authentication for the user
    # We can test query directly or via API if we can mock auth. 
    # Let's check DB directly for "visible" inbox query logic first for simplicity.
    
    # Simulate CRM inbox query (is_deleted=False)
    inbox_item = db.query(AdminMessageInbox).join(AdminMessage).filter(
        AdminMessageInbox.user_id == user.id,
        AdminMessageInbox.message_id == msg_id,
        AdminMessage.is_deleted == False
    ).first()
    assert inbox_item is not None, "Message should be visible initially"

    # 4. Admin Recalls (DELETE API)
    del_resp = client.delete(f"/admin/api/crm/messages/{msg_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "ok"
    
    db.expunge_all() # Clear session cache to get fresh data
    
    # 5. Verify Inbox again (Should be gone)
    inbox_item_after = db.query(AdminMessageInbox).join(AdminMessage).filter(
        AdminMessageInbox.user_id == user.id,
        AdminMessageInbox.message_id == msg_id,
        AdminMessage.is_deleted == False
    ).first()
    assert inbox_item_after is None, "Message should NOT be visible after recall"
    
    # 6. Verify Admin List (Should still exist but marked deleted)
    # API: GET /admin/api/crm/messages
    list_resp = client.get("/admin/api/crm/messages")
    assert list_resp.status_code == 200
    msgs = list_resp.json()
    target_msg = next((m for m in msgs if m["id"] == msg_id), None)
    
    assert target_msg is not None, "Message should still be in admin history"
    # Note: We didn't expose is_deleted in MessageResponse yet, checking DB
    
    db_msg = db.query(AdminMessage).filter(AdminMessage.id == msg_id).first()
    assert db_msg.is_deleted == True
    
    db.close()
