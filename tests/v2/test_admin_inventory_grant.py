import pytest


@pytest.mark.integration
class TestAdminInventoryGrant:
    def test_grant_ticket(self, test_client, admin_token, base_user):
        # TODO: implement ticket grant
        assert True
