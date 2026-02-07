import pytest


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminOpsStatusSmoke:
    def test_ops_status(self, test_client, admin_token):
        res = test_client.get(
            "/api/v2/admin/ops/status",
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert "system" in data
        assert "goldenRadar" in data
        assert "metrics" in data
