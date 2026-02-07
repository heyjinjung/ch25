import pytest

from app.v2.models import Team


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminTeamBattleForceMember:
    def test_force_join(self, test_client, admin_token, base_user, db_session):
        team = Team(name="강제팀", icon=None, is_active=True)
        db_session.add(team)
        db_session.commit()
        db_session.refresh(team)

        res = test_client.post(
            "/api/v2/admin/team-battle/members/force-join",
            json={"user_id": base_user.id, "team_id": team.id, "reason": "테스트"},
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["team_id"] == team.id

    def test_force_leave(self, test_client, admin_token, base_user, db_session):
        team = Team(name="강제팀2", icon=None, is_active=True)
        db_session.add(team)
        db_session.commit()
        db_session.refresh(team)

        join_res = test_client.post(
            "/api/v2/admin/team-battle/members/force-join",
            json={"user_id": base_user.id, "team_id": team.id, "reason": "테스트"},
            headers=_auth_headers(admin_token),
        )
        assert join_res.status_code == 200

        leave_res = test_client.post(
            "/api/v2/admin/team-battle/members/force-leave",
            json={"user_id": base_user.id, "reason": "테스트"},
            headers=_auth_headers(admin_token),
        )
        assert leave_res.status_code == 200
        assert leave_res.json()["success"] is True
