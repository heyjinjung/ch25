import sys
import os
import asyncio
from datetime import datetime
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_admin_info, get_db
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.user_retention_state import UserRetentionState
from app.models.game_wallet import UserGameWallet, GameTokenType

# Mock Dependencies
def override_get_current_admin_info():
    return 999, "SUPER_ADMIN"

def override_get_db():
    db = MagicMock()
    
    # Mock User Data
    mock_user = User(
        id=101, 
        nickname="CoffeeLoveVIP", 
        total_charge_amount=15000000,
        created_at=datetime.utcnow(),
        level=5,
        status="ACTIVE"
    )
    mock_retention = UserRetentionState(user_id=101, churn_probability_score=0.92)
    mock_wallet = UserGameWallet(user_id=101, token_type=GameTokenType.ROULETTE_COIN, balance=42)
    mock_withdrawal = VaultWithdrawalRequest(
        id=1,
        user_id=101,
        amount=50000,
        status="PENDING",
        created_at=datetime.utcnow(),
        user=mock_user
    )
    
    # Setup chain mocks
    mock_user_query = MagicMock()
    mock_user_query.filter.return_value.first.return_value = mock_user
    mock_user_query.filter.return_value.count.return_value = 5
    
    mock_retention_query = MagicMock()
    mock_retention_query.filter.return_value.first.return_value = mock_retention
    mock_retention_query.filter.return_value.count.return_value = 2
    
    mock_withdrawal_query = MagicMock()
    mock_withdrawal_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_withdrawal]
    
    mock_wallet_query = MagicMock()
    mock_wallet_query.filter.return_value.all.return_value = [mock_wallet]

    def query_side_effect(*args):
        targets = [getattr(a, "__name__", str(a)) for a in args]
        
        if "User" in targets and "UserRetentionState" in targets:
             # Multi-table query for Crisis Radar
             q = MagicMock()
             q.join.return_value.filter.return_value.limit.return_value.all.return_value = [(mock_user, mock_retention)]
             return q
        
        if "User" in targets: return mock_user_query
        if "VaultWithdrawalRequest" in targets: return mock_withdrawal_query
        if "UserRetentionState" in targets: return mock_retention_query
        if "UserGameWallet" in targets: return mock_wallet_query
        
        return MagicMock()

    db.query.side_effect = query_side_effect
    db.query.return_value.scalar.return_value = 100000
    
    yield db

app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_admin_routes():
    print("=== Testing Admin V2 Routes ===")
    
    # 1. User Detail
    url = "/api/v2/admin/users/101"
    print(f"\n[1] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: {data['nickname']} (Risk: {data['risk_level']})")
        assert data['id'] == 101
        assert data['risk_level'] == "HIGH"
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 2. Withdrawals
    url = "/api/v2/admin/withdrawals"
    print(f"\n[2] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Found {len(data)} pending withdrawals")
        assert len(data) > 0
        assert data[0]['status'] == "PENDING"
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 3. Ops Status
    url = "/api/v2/admin/ops/status"
    print(f"\n[3] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: System={data['system']['db']}, Whales={data['golden_radar']['high_rollers']}")
        assert data['system']['db'] == "OK"
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 4. Dashboard Metrics (New)
    url = "/api/v2/admin/dashboard/metrics"
    print(f"\n[4] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Active Users={data['active_users']['value']}")
        assert data['range_hours'] == 24
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 5. Streak Metrics (New)
    url = "/api/v2/admin/dashboard/streak"
    print(f"\n[5] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Streak Days={data['days']}")
        assert data['days'] == 7
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 6. Dice Config (New)
    url = "/api/v2/admin/game-config/dice"
    print(f"\n[6] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Dice Config Name={data['name']}")
        assert data['name'] == "Standard Dice"
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

    # 7. Feed Config (New)
    url = "/api/v2/admin/feed/config"
    print(f"\n[7] GET {url}")
    response = client.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Jackpot Threshold={data['threshold']}")
        assert data['threshold'] == 10000
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_admin_routes()
