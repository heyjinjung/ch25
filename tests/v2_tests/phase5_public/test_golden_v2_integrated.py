import pytest
import json
import time
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.v2.models.user import V2User
from app.v2.models.auth_event import V2UserAuthEvent
from app.v2.services.vault_service import V2VaultService
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.latency_survival_service import V2LatencySurvivalService
from app.v2.services.circuit_breaker_service import CircuitBreakerService
from app.v2.services.admin_user_service import V2AdminUserService
from app.v2.services.user_service import V2UserService
from app.v2.models.v2_user_deposit_evidence import EvidenceStatus
from app.v2.core.exceptions import CircuitBreakerError
from app.v2.models.v2_server_config import V2ServerConfig
from app.models.user import User
from app.models.vault_ledger import VaultLedger
from app.core.config import get_settings
from app.core.redis import redis_client

# Utils from existing tests
from tests.v2.test_telegram_auth import generate_test_init_data, TEST_BOT_TOKEN

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_redis():
    """테스트 전 Redis 초기화"""
    redis_client.flushdb()
    yield

@pytest.fixture
def auth_header(monkeypatch):
    """V2 Telegram Auth를 통한 토큰 획득 및 헤더 생성"""
    from app.v2.core import telegram
    
    # Mock settings for telegram bot token
    def mock_get_settings():
        settings = get_settings()
        settings.telegram_bot_token = TEST_BOT_TOKEN
        settings.v2_access_token_expire_minutes = 15
        return settings
    
    monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)
    monkeypatch.setattr("app.v2.services.auth_service.get_settings", mock_get_settings)

    # 1. Generate initData (telegram_id = 10000001)
    tg_id = 10000001
    init_data = generate_test_init_data(
        user_id=tg_id,
        username="golden_integrated_user",
        first_name="Golden",
        last_name="Integrated"
    )

    # 2. Login
    response = client.post("/api/v2/telegram/auth", json={"init_data": init_data})
    assert response.status_code == 200
    data = response.json()
    access_token = data["access_token"]
    v2_user_id = data["user"]["id"] # 실제 DB PK
    
    return {
        "headers": {"Authorization": f"Bearer {access_token}"},
        "v2_user_id": v2_user_id,
        "tg_id": tg_id
    }

def test_golden_v2_full_lifecycle_integrated(db: Session, auth_header, monkeypatch):
    """
    Golden V2의 전체 수명 주기를 검증하는 통합 연동 테스트
    """
    v2_user_id = auth_header["v2_user_id"]
    
    # --- Step 1: Auth & User Creation ---
    v2_user = db.query(V2User).filter(V2User.id == v2_user_id).first()
    assert v2_user is not None
    assert v2_user.nickname == "Golden Integrated"
    
    # --- Step 1.1: Age user for Suspension Testing ---
    # 신규 유저는 7일 유예기간이 있으므로, CreatedAt을 10일 전으로 조작하여 제재 상태 시뮬레이션
    from datetime import datetime, timedelta, timezone
    v2_user.created_at = datetime.now(timezone.utc) - timedelta(days=10)
    db.add(v2_user)
    db.flush()
    
    # --- Step 2: [DEPRECATED] V1 Sync Trigger removed ---
    # Pure V2 Native에서는 JIT V1 생성을 하지 않음.
    
    # --- Step 3: Asset Grant & Circuit Breaker ---
    # 10,000 VAULT 지급
    V2VaultService.deposit(db, v2_user_id, 10000)
    db.commit()
    
    # V1(User 테이블) 잔액 동기화 확인 (DEPRECATED in Pure V2)
    # legacy_user = db.get(User, v2_user_id)
    # assert legacy_user is not None
    # assert int(legacy_user.vault_locked_balance) == 10000
    
    # 5 ROULETTE_TICKET 지급
    V2InventoryService.grant_wallet_tokens(db, v2_user_id, "ROULETTE_TICKET", 5)
    db.commit()
    
    # --- Step 4: Latency Survival & Bypass ---
    # 입금 지연 상황 연출 (최근 입금 합계 0 -> 제재 상태)
    # V2VaultService.is_benefits_suspended 는 ExternalRankingDailyDepositDelta를 참조함
    is_suspended, _ = V2VaultService.is_benefits_suspended(db, v2_user_id)
    assert is_suspended is True
    
    # 증거 제출 (5만원)
    evidence = V2LatencySurvivalService.submit_evidence(db, v2_user_id, "TX_INTEGRATED_001", 50000)
    db.commit()
    
    # 보상 확인 (ROULETTE_TICKET +5 -> 총 10)
    balance = V2InventoryService.get_wallet_balance(db, v2_user_id, "ROULETTE_TICKET")
    assert balance == 10
    
    # 제재 예외(Bypass) 확인
    is_suspended_now, _ = V2VaultService.is_benefits_suspended(db, v2_user_id)
    assert is_suspended_now is False # 증거 제출로 인해 Bypass 활성화됨
    
    # --- Step 5: Economy Logic (Shop & Spent Today) ---
    # 5,000 VAULT 소비
    V2VaultService.withdraw(db, v2_user_id, 5000)
    
    # --- Step 6: Circuit Breaker Breach ---
    # Mock config for low limit
    cb_config = V2ServerConfig(
        key="circuit_breaker_thresholds",
        value={"VAULT": {"global_max": 5000, "user_max": 2000}}
    )
    db.add(cb_config)
    db.commit()
    
    with pytest.raises(CircuitBreakerError):
        # 10,000 입금 시도 (한도 2,000 초과)
        V2VaultService.deposit(db, v2_user_id, 10000)
    
    # Reset CB (Global and User)
    CircuitBreakerService.reset_limit("VAULT", "GLOBAL")
    CircuitBreakerService.reset_limit("VAULT", "USER", user_id=v2_user_id)
    
    # 다시 성공해야 함 (100원은 이제 두 한도 모두 통과)
    V2VaultService.deposit(db, v2_user_id, 100) # 성공
    
    # --- Step 7: Admin Cleanup (Purge) ---
    V2AdminUserService.purge_user(db, user_id=v2_user_id)
    db.commit()
    
    # 모든 흔적 삭제 확인
    assert db.get(V2User, v2_user_id) is None
    # assert db.get(User, v2_user_id) is None # Pure V2
    assert db.query(V2UserAuthEvent).filter(V2UserAuthEvent.user_id == v2_user_id).count() == 0
