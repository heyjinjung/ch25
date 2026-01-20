import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_team_battle_api_contract_ko.md

def test_v2_team_battle_endpoints_exist(client: TestClient):
    # Team Battle
    assert client.get("/api/v2/team-battle/status").status_code != 404
    assert client.post("/api/v2/team-battle/join").status_code != 404
    assert client.get("/api/v2/team-battle/rankings").status_code != 404
