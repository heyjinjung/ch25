import pytest


@pytest.mark.integration
class TestAdminTeamBattleForceMember:
    def test_force_join(self, test_client, admin_token, base_user):
        # TODO: implement force join flow
        assert True

    def test_force_leave(self, test_client, admin_token, base_user):
        # TODO: implement force leave flow
        assert True
