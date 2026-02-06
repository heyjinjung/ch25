import pytest


@pytest.mark.integration
class TestAdminMarketingMessageFanout:
    def test_create_message_and_fanout(self, test_client, admin_token, base_user):
        # TODO: implement message create + fanout
        assert True
