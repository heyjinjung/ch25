import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_auth_user_api_contract_ko.md

def test_v2_auth_user_endpoints_exist(client: TestClient):
    # Auth
    assert client.post("/api/v2/auth/login").status_code != 404
    assert client.post("/api/v2/auth/refresh").status_code != 404
    assert client.post("/api/v2/auth/logout").status_code != 404
    
    # User Profile
    assert client.get("/api/v2/user/me").status_code != 404
    assert client.get("/api/v2/user/balance").status_code != 404
