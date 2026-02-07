import pytest


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminUserAssetAdjust:
    def test_adjust_user_assets(self, test_client, admin_token, base_user, db_session):
        payload = {"amount": 1500, "token_type": "VAULT", "reason": "테스트"}
        res = test_client.post(
            f"/api/v2/admin/users/{base_user.id}/wallet/adjust",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        db_session.refresh(base_user)
        assert int(base_user.vault_locked_balance or 0) == 1500

    def test_adjust_negative_guard(self, test_client, admin_token, base_user, db_session):
        payload = {"amount": -500, "token_type": "VAULT", "reason": "테스트"}
        res = test_client.post(
            f"/api/v2/admin/users/{base_user.id}/wallet/adjust",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 400
        db_session.refresh(base_user)
        assert int(base_user.vault_locked_balance or 0) == 0
