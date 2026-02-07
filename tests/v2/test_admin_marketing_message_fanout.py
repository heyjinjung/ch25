import pytest

from app.v2.models.v2_admin_message import V2AdminMessageInbox


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminMarketingMessageFanout:
    def test_create_message_and_fanout(self, test_client, admin_token, base_user, db_session):
        payload = {
            "title": "공지",
            "content": "테스트 메시지",
            "target_type": "USER",
            "target_value": str(base_user.id),
            "channels": ["INBOX"],
        }
        res = test_client.post(
            "/api/v2/admin/marketing/messages",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 201
        data = res.json()
        assert data["recipient_count"] == 1

        inbox = (
            db_session.query(V2AdminMessageInbox)
            .filter(V2AdminMessageInbox.user_id == base_user.id, V2AdminMessageInbox.message_id == data["id"])
            .first()
        )
        assert inbox is not None
