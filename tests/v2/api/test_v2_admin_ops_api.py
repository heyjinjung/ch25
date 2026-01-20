import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_admin_ops_api_contract_ko.md

def test_v2_admin_ops_endpoints_exist(client: TestClient):
    # Just verifying routes are registered (even if 401/403)
    # Admin Ops
    assert client.get("/api/v2/admin/ops/dashboard").status_code != 404
    
    # We expect these to be at least reachable for auth check
    response = client.get("/api/v2/admin/ops/plans") 
    assert response.status_code != 404, "Endpoint /api/v2/admin/ops/plans should exist"
    
    response = client.post("/api/v2/admin/ops/plans") 
    assert response.status_code != 404
