import os
import sys

# Add project root to sys.path
sys.path.append(os.getcwd())

# Set environment variables for testing
os.environ["DATABASE_URL"] = "mysql+pymysql://xmasuser:xmaspass@localhost:3307/xmas_event"
os.environ["JWT_SECRET"] = "dev-local-jwt-secret-change-me-please-32chars-min"
os.environ["ENV"] = "local"

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.api.deps import get_current_admin_id

app.dependency_overrides[get_current_admin_id] = lambda: 1

client = TestClient(app)

def test_crm_stats():
    print("\n[Test] Fetching CRM Stats...")
    response = client.get("/admin/api/crm/stats")
    if response.status_code != 200:
        print(f"FAILED: {response.status_code} - {response.text}")
    assert response.status_code == 200
    data = response.json()
    print(f"Stats: Total={data['total_users']}, Paying={data['paying_users']}, Conv={data['conversion_rate']}%")
    assert "total_users" in data
    assert "conversion_rate" in data

def test_segment_detail():
    segments = ["TOTAL_USERS", "PAYING_USERS", "WHALE", "EMPTY_TANK", "DORMANT"]
    for segment in segments:
        print(f"\n[Test] Fetching segment detail for: {segment}")
        response = client.get(f"/admin/api/crm/segment-detail?segment_type={segment}")
        assert response.status_code == 200
        users = response.json()
        print(f"  Found {len(users)} users")
        if users:
            user = users[0]
            print(f"  Example User: ID={user['user_id']}, ExtID={user['external_id']}, RealName={user['real_name']}")
            assert "user_id" in user
            assert "external_id" in user
            assert "computed_segments" in user

if __name__ == "__main__":
    import traceback
    try:
        test_crm_stats()
        test_segment_detail()
        print("\n✅ Backend CRM Refinement Tests Passed!")
    except Exception:
        print("\n❌ Test Failed:")
        traceback.print_exc()
        sys.exit(1)
