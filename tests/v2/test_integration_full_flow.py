"""
통합 시나리오 테스트: Deposit → Level → Vault 전체 플로우
"""
import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User
from app.v2.services.admin_cc_deposit_service import AdminCCDepositService
from app.v2.services.level_xp_service import V2LevelXPService
from app.v2.services.vault_service import V2VaultService


@pytest.fixture
def integration_user(db: Session) -> V2User:
    """통합 테스트용 유저"""
    user = V2User(
        cc_id="INTEGRATION_TEST",
        nickname="통합테스트유저",
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
        vault_locked_balance=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestDepositToLevelFlow:
    """입금 → 레벨 통합 플로우"""

    def test_deposit_triggers_xp(self, db: Session, integration_user: V2User):
        """입금 시 XP 자동 적립 확인"""
        # Given
        deposit_service = AdminCCDepositService()
        
        # When: 500,000원 입금
        deposit_service.record_deposit(
            db,
            user_id=integration_user.id,
            amount=500000,
            source="test_flow"
        )
        db.commit()

        # Then: total_charge_amount와 XP 업데이트
        db.refresh(integration_user)
        assert integration_user.total_charge_amount == 500000
        assert integration_user.xp >= 100  # 50만원 = 100XP


class TestVaultCycle:
    """Vault 입출금 사이클 테스트"""

    def test_vault_deposit_withdraw_cycle(self, db: Session, integration_user: V2User):
        """Vault 입금 → 출금 사이클"""
        # Given
        vault_service = V2VaultService()
        
        # When: 10,000원 적립
        vault_service.adjust_balance(
            db,
            user_id=integration_user.id,
            amount=10000,
            reason="game_win",
            force=False
        )
        db.commit()
        db.refresh(integration_user)
        assert integration_user.vault_locked_balance == 10000
        
        # Then: 5,000원 출금
        vault_service.adjust_balance(
            db,
            user_id=integration_user.id,
            amount=-5000,
            reason="withdrawal",
            force=False
        )
        db.commit()
        db.refresh(integration_user)
        assert integration_user.vault_locked_balance == 5000


class TestSOTIntegrity:
    """SoT 데이터 무결성 검증"""

    def test_v2_user_is_sot_for_level_xp(self, db: Session, integration_user: V2User):
        """V2User가 레벨/XP의 단일 진실 공급원"""
        # Given
        level_service = V2LevelXPService()
        
        # When: XP 추가
        level_service.add_xp(db, user_id=integration_user.id, delta=300, source="sot_test")
        db.commit()

        # Then: v2_user가 최종 진실
        db.refresh(integration_user)
        assert integration_user.xp == 300
        assert integration_user.level >= 1

    def test_vault_locked_balance_only_sot(self, db: Session, integration_user: V2User):
        """Vault SoT: locked_balance만 사용"""
        # Given
        vault_service = V2VaultService()
        
        # When: 50,000원 설정
        integration_user.vault_locked_balance = 50000
        integration_user.vault_available_balance = 0  # deprecated
        db.commit()

        # Then: locked만 유효
        status = vault_service.get_status(db, integration_user.id)
        assert status["locked_balance"] == 50000


@pytest.mark.parametrize("scenario", [
    {"deposit": 100000, "expected_xp": 20},
    {"deposit": 500000, "expected_xp": 100},
    {"deposit": 1000000, "expected_xp": 200}
])
def test_deposit_xp_integration(db: Session, integration_user: V2User, scenario: dict):
    """입금 → XP 통합 시나리오 파라미터 테스트"""
    # Given
    deposit_service = AdminCCDepositService()
    
    # When
    deposit_service.record_deposit(
        db,
        user_id=integration_user.id,
        amount=scenario["deposit"],
        source=f"test_{scenario['deposit']}"
    )
    db.commit()
    
    # Then
    db.refresh(integration_user)
    assert integration_user.total_charge_amount == scenario["deposit"]
    assert integration_user.xp >= scenario["expected_xp"]
