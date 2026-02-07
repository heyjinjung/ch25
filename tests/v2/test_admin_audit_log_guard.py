import pytest

from app.v2.models import AdminAuditLog


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminAuditLogGuard:
    def test_audit_log_created(self, test_client, admin_token, db_session, base_user):
        payload = {"amount": 1000, "token_type": "VAULT", "reason": "테스트"}
        res = test_client.post(
            f"/api/v2/admin/users/{base_user.id}/wallet/adjust",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200

        log = (
            db_session.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "WALLET_ADJUST", AdminAuditLog.target_id == str(base_user.id))
            .order_by(AdminAuditLog.id.desc())
            .first()
        )
        assert log is not None
