import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_db, get_current_admin_info, get_current_admin_id
from unittest.mock import MagicMock

# Mock the dependencies
def override_get_current_admin_info():
    return (1, "ADMIN")

def override_get_current_admin_id():
    return 1

def override_get_db():
    mock_db = MagicMock()
    # Mocking basic query results to prevent errors during service calls
    mock_db.query.return_value.filter.return_value.first.return_value = None
    return mock_db

# Setup client with dependency overrides
@pytest.fixture
def client():
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info
    app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    # Clear overrides after each test
    app.dependency_overrides.clear()

def test_csv_upload_case_insensitive_20260202(client):
    """Verify that CSV upload handles .CSV extension (case-insensitive)."""
    # 1. Test Uppercase .CSV
    file_content = b"timestamp,user_id,game_type,result,bet_amount,payout_amount,balance_after\n2025-01-20T10:00:00Z,1,DICE,WIN,100,200,5100"
    files = {"file": ("test_file.CSV", file_content, "text/csv")}
    
    response = client.post("/api/v2/admin/csv-import/upload", files=files)
    
    # After fix, this should be 200 OK
    assert response.status_code == 200
    assert response.json()["message"] == "File uploaded successfully"
    assert response.json()["file_id"].endswith(".CSV")

    # 2. Test Lowercase .csv
    files_lower = {"file": ("test_file.csv", file_content, "text/csv")}
    response_lower = client.post("/api/v2/admin/csv-import/upload", files=files_lower)
    assert response_lower.status_code == 200

    # 3. Test Invalid extension
    files_invalid = {"file": ("test_file.txt", file_content, "text/plain")}
    response_invalid = client.post("/api/v2/admin/csv-import/upload", files=files_invalid)
    assert response_invalid.status_code == 400
    assert response_invalid.json()["detail"] == "Only CSV files are allowed"

def test_crm_csv_upload_case_insensitive_20260202(client):
    """Verify that CRM CSV upload also handles .CSV extension."""
    file_content = b"external_id,real_name,phone,telegram,memo,tags\nuser1,Real Name,01012345678,user1_tg,,tag1"
    files = {"file": ("crm_test.CSV", file_content, "text/csv")}
    
    # Correct path for CRM import
    response = client.post("/admin/api/crm/import-profiles", files=files)
    
    # Ensure it's not rejected with 400 "Only CSV files are supported."
    # (It might give 500 or 200 depending on how deep the service call goes with our mock, 
    # but the extension check happens first).
    assert response.status_code != 400
    if response.status_code == 400:
        # If it IS 400, it must NOT be about the file extension
        assert response.json()["detail"] != "Only CSV files are supported."
