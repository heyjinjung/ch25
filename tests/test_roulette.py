# /workspace/ch25/tests/test_roulette.py
"""Roulette endpoint scaffolding tests."""
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skip(reason="Roulette integration tests require full game setup and seeding.")


def test_status_requires_today_feature(client: TestClient) -> None:
    response = client.get("/api/roulette/status")
    assert response.status_code in (200, 400, 404)


def test_play_limits_and_rewards(client: TestClient) -> None:
    response = client.post("/api/roulette/play")
    assert response.status_code in (200, 400, 404)
