import pytest

from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize


def _auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.integration
class TestAdminGameConfigIntegration:
    def test_save_roulette_segments(self, test_client, admin_token, db_session):
        config = V2RouletteConfig(
            name="test_config",
            ticket_type="ROULETTE_TICKET",
            is_active=True,
            max_daily_spins=5,
            grade="COMMON",
        )
        db_session.add(config)
        db_session.flush()
        segments = []
        for idx in range(8):
            segments.append(
                V2RouletteSegment(
                    config_id=config.id,
                    slot_index=idx,
                    label=f"슬롯 {idx + 1}",
                    weight=1,
                    reward_type="NONE",
                    reward_amount=0,
                    is_jackpot=False,
                )
            )
        db_session.add_all(segments)
        db_session.commit()

        payload = {
            "name": "test_config_updated",
            "ticket_type": "ROULETTE_TICKET",
            "max_daily_spins": 7,
            "is_active": True,
            "segments": [
                {
                    "slot_index": 0,
                    "label": "업데이트 슬롯 1",
                    "weight": 5,
                    "reward_type": "NONE",
                    "reward_amount": 0,
                    "is_jackpot": False,
                },
                *[
                    {
                        "slot_index": i,
                        "label": f"슬롯 {i + 1}",
                        "weight": 1,
                        "reward_type": "NONE",
                        "reward_amount": 0,
                        "is_jackpot": False,
                    }
                    for i in range(1, 8)
                ],
            ],
        }

        res = test_client.put(
            f"/api/v2/admin/game/roulette/config/{config.id}",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "test_config_updated"
        assert len(data["segments"]) == 8
        assert data["segments"][0]["label"] == "업데이트 슬롯 1"

    def test_save_lottery_stock(self, test_client, admin_token, db_session):
        config = V2LotteryConfig(
            name="test_lottery",
            ticket_type="LOTTERY_TICKET",
            is_active=True,
            max_daily_tickets=3,
            puzzle_piece_probability=0.0,
        )
        db_session.add(config)
        db_session.flush()
        prize = V2LotteryPrize(
            config_id=config.id,
            label="기본상품",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=0,
            is_active=True,
        )
        db_session.add(prize)
        db_session.commit()

        payload = {"stock": 5}
        res = test_client.put(
            f"/api/v2/admin/game/lottery/config/{config.id}/prize/{prize.id}",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["stock"] == 5
