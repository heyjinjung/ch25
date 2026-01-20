import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md

def test_v2_mission_streak_endpoints_exist(client: TestClient):
    # Missions
    assert client.get("/api/v2/mission/list").status_code != 404
    assert client.post("/api/v2/mission/claim").status_code != 404
    
    # Streak
    assert client.get("/api/v2/streak/status").status_code != 404
