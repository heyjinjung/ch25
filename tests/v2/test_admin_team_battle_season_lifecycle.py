import pytest


@pytest.mark.integration
class TestAdminTeamBattleSeasonLifecycle:
    def test_create_activate_end_season(self, test_client, admin_token):
        # TODO: implement season create -> activate -> end
        assert True

    def test_duplicate_active_season_rejected(self, test_client, admin_token):
        # TODO: implement duplicate active season guard
        assert True
