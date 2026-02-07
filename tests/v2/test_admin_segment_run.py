import pytest


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminSegmentRun:
    def test_segment_run(self, test_client, admin_token, base_user):
        res = test_client.post(
            "/api/v2/admin/segments/batch/run",
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("processed", 0) >= 1
