import pytest


@pytest.mark.integration
class TestAdminUserAssetAdjust:
    def test_adjust_user_assets(self, test_client, admin_token, base_user):
        # TODO: implement asset adjust flow
        assert True

    def test_adjust_negative_guard(self, test_client, admin_token, base_user):
        # TODO: implement negative adjust guard
        assert True
