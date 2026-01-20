import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_game_api_contract_ko.md

def test_v2_game_endpoints_exist(client: TestClient):
    games = ["roulette", "dice", "lottery"]
    for game in games:
        assert client.get(f"/api/v2/{game}/status").status_code != 404
        assert client.post(f"/api/v2/{game}/play").status_code != 404
