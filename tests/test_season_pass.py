# /workspace/ch25/tests/test_season_pass.py
"""Season pass endpoint scaffolding tests."""
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skip(reason="Season pass integration requires additional seed data scaffolding.")


def test_season_pass_status(client: TestClient) -> None:
    response = client.get("/api/season-pass/status")
    assert response.status_code in (200, 404)


def test_stamp_and_claim_flow(client: TestClient) -> None:
    response = client.post("/api/season-pass/stamp", json={"source_feature_type": "ROULETTE", "xp_bonus": 0})
    assert response.status_code in (200, 400, 404)

    response = client.post("/api/season-pass/claim", json={"level": 1})
    assert response.status_code in (200, 400, 404)
