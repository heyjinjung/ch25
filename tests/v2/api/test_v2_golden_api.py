import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_golden_api_contract_ko.md

def test_v2_golden_endpoints_exist(client: TestClient):
    # Golden Hour & System
    assert client.get("/api/v2/golden/status").status_code != 404
    assert client.get("/api/v2/golden/history").status_code != 404
