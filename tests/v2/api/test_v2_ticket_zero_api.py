import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_ticket_zero_api_contract_ko.md

def test_v2_ticket_zero_endpoints_exist(client: TestClient):
    # Ticket Zero
    assert client.get("/api/v2/ticket-zero/status").status_code != 404
    assert client.post("/api/v2/ticket-zero/claim").status_code != 404
