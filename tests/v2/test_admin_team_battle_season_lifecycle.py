import pytest
from datetime import datetime, timedelta


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminTeamBattleSeasonLifecycle:
    def test_create_activate_end_season(self, test_client, admin_token):
        now = datetime.utcnow()
        payload = {
            "name": "시즌1",
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now + timedelta(days=7)).isoformat(),
            "is_active": False,
        }
        res = test_client.post(
            "/api/v2/admin/team-battle/seasons",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        season_id = res.json()["id"]

        activate = test_client.patch(
            f"/api/v2/admin/team-battle/seasons/{season_id}",
            json={"is_active": True},
            headers=_auth_headers(admin_token),
        )
        assert activate.status_code == 200
        assert activate.json()["is_active"] is True

        end_res = test_client.post(
            f"/api/v2/admin/team-battle/seasons/{season_id}/end",
            json={"distribute_rewards": False},
            headers=_auth_headers(admin_token),
        )
        assert end_res.status_code == 200
        assert end_res.json()["season_id"] == season_id

    def test_duplicate_active_season_rejected(self, test_client, admin_token):
        now = datetime.utcnow()
        s1 = test_client.post(
            "/api/v2/admin/team-battle/seasons",
            json={
                "name": "시즌A",
                "starts_at": (now - timedelta(days=2)).isoformat(),
                "ends_at": (now + timedelta(days=2)).isoformat(),
                "is_active": True,
            },
            headers=_auth_headers(admin_token),
        )
        assert s1.status_code == 200
        season1_id = s1.json()["id"]

        s2 = test_client.post(
            "/api/v2/admin/team-battle/seasons",
            json={
                "name": "시즌B",
                "starts_at": (now - timedelta(days=1)).isoformat(),
                "ends_at": (now + timedelta(days=3)).isoformat(),
                "is_active": False,
            },
            headers=_auth_headers(admin_token),
        )
        assert s2.status_code == 200
        season2_id = s2.json()["id"]

        activate_s2 = test_client.patch(
            f"/api/v2/admin/team-battle/seasons/{season2_id}",
            json={"is_active": True},
            headers=_auth_headers(admin_token),
        )
        assert activate_s2.status_code == 200

        s1_after = test_client.get(
            f"/api/v2/admin/team-battle/seasons/{season1_id}",
            headers=_auth_headers(admin_token),
        )
        assert s1_after.status_code == 200
        assert s1_after.json()["is_active"] is False
