from app.services import game_common


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, int | str] = {}
        self.expiry: dict[str, int] = {}

    def incr(self, key: str) -> int:
        value = int(self.store.get(key, 0) or 0) + 1
        self.store[key] = value
        return value

    def expire(self, key: str, ttl: int) -> None:
        self.expiry[key] = ttl

    def set(self, key: str, value: int | str, ex: int | None = None, nx: bool = False):
        if nx and key in self.store:
            return False
        self.store[key] = value
        if ex is not None:
            self.expiry[key] = ex
        return True


def test_infer_game_result():
    assert game_common._infer_game_result({"result": "WIN"}) == "WIN"
    assert game_common._infer_game_result({"outcome": "LOSE"}) == "LOSE"
    assert game_common._infer_game_result({"reward_amount": 100}) == "WIN"
    assert game_common._infer_game_result({"reward_amount": 0}) == "LOSE"


def test_update_golden_redis_state_loss_then_win():
    client = FakeRedis()

    game_common._update_golden_redis_state(client, user_id=7, result="LOSE", current_balance=5000)
    assert client.store["user:7:loss_streak"] == 1
    assert client.store["golden:v2:user:7:loss_streak"] == 1
    assert client.store["golden:v2:user:7:session_start_balance"] == 5000
    assert client.store["golden:v2:user:7:psych_state"] == "NEUTRAL"

    game_common._update_golden_redis_state(client, user_id=7, result="WIN", current_balance=7000)
    assert client.store["user:7:loss_streak"] == 0
    assert client.store["golden:v2:user:7:loss_streak"] == 0
