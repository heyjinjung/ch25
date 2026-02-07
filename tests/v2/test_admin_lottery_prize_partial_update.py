import pytest

from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminLotteryPrizePartialUpdate:
    def test_update_label_only(self, test_client, admin_token, db_session):
        config = V2LotteryConfig(
            name="test_lottery",
            ticket_type="LOTTERY_TICKET",
            is_active=True,
            max_daily_tickets=5,
            puzzle_piece_probability=0.0,
        )
        db_session.add(config)
        db_session.flush()

        prize = V2LotteryPrize(
            config_id=config.id,
            label="기존라벨",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=10,
            is_active=True,
        )
        db_session.add(prize)
        db_session.commit()

        payload = {"label": "신규라벨"}
        res = test_client.put(
            f"/api/v2/admin/game/lottery/config/{config.id}/prize/{prize.id}",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["label"] == "신규라벨"
        assert data["stock"] == 10
