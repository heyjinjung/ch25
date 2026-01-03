import pytest

from fastapi.testclient import TestClient

from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.models.user import User


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_edit_message_reflects_in_user_inbox(client: TestClient, db_session):
    # Ensure the overridden auth user exists (conftest returns user_id=1).
    user = db_session.query(User).filter(User.id == 1).one_or_none()
    if user is None:
        user = User(id=1, external_id="user-1", nickname="User1")
        db_session.add(user)
        db_session.commit()

    msg = AdminMessage(
        sender_admin_id=1,
        title="Before",
        content="Before Content",
        target_type="USER",
        target_value="1",
        channels=["INBOX"],
        recipient_count=1,
        read_count=0,
    )
    db_session.add(msg)
    db_session.commit()
    db_session.refresh(msg)

    inbox = AdminMessageInbox(user_id=1, message_id=msg.id, is_read=False)
    db_session.add(inbox)
    db_session.commit()

    # Update via admin endpoint
    res = client.put(f"/admin/api/crm/messages/{msg.id}", json={"title": "After", "content": "After Content"})
    assert res.status_code == 200
    assert res.json()["title"] == "After"
    assert res.json()["content"] == "After Content"

    # User inbox should now show updated fields
    res = client.get("/api/crm/messages/inbox")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == msg.id
    assert items[0]["title"] == "After"
    assert items[0]["content"] == "After Content"
