from fastapi.testclient import TestClient
from app.main import app

def test_v2_health_connectivity():
    client = TestClient(app)
    response = client.get("/api/v2/health")
    print(f"\n[DEBUG] GET /api/v2/health -> {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
