"""
V2 Level & CC Deposit 테스트: SoT 준수 검증
SoT 기준: V2 SoT 통합 (2026-02-04)
"""
import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User
from app.v2.services.level_xp_service import V2LevelXPService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService


@pytest.fixture
def test_user(db: Session) -> V2User:
    """테스트용 유저 생성"""
    user = V2User(
        cc_id="TEST_LEVEL_USER",
        nickname="레벨테스트유저",
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestLevelXPService:
    """Level XP Service V2 SoT 테스트"""

    def test_level_xp_v2_sot_compliance(self, db: Session, test_user: V2User):
        """Level/XP V2 SoT 준수: v2_user.level, v2_user.xp가 단일 진실 공급원"""
        # Given
        service = V2LevelXPService()
        
        # When: XP 추가
        result = service.add_xp(db, user_id=test_user.id, delta=100, source="test")
        db.commit()

        # Then: v2_user가 SoT
        db.refresh(test_user)
        assert test_user.xp == 100
        assert result["xp"] == 100
        assert result["level"] >= 1

    def test_add_xp_basic(self, db: Session, test_user: V2User):
        """기본 XP 추가 테스트"""
        # Given
        service = V2LevelXPService()
        
        # When
        result = service.add_xp(db, user_id=test_user.id, delta=50, source="test_basic")
        db.commit()

        # Then
        db.refresh(test_user)
        assert test_user.xp == 50
        assert "added_xp" in result


class TestCCDepositService:
    """CC Deposit Service 테스트"""

    def test_cc_deposit_basic(self, db: Session, test_user: V2User):
        """기본 CC Deposit 테스트"""
        # Given
        from app.v2.schemas.shared.cc_deposit import CCDepositCreate
        service = V2AdminCCDepositService()
        
        # When: 100,000원 입금 (upsert_many 사용)
        deposit_data = CCDepositCreate(
            user_id=test_user.id,
            cc_id=test_user.cc_id,
            deposit_amount=100000,
            play_count=0,
            memo="test_deposit"
        )
        service.upsert_many(db, [deposit_data])

        # Then: V2User 업데이트 확인
        db.refresh(test_user)
        assert test_user.total_charge_amount == 100000

    def test_cc_deposit_xp_integration(self, db: Session, test_user: V2User):
        """CC Deposit 시 XP 자동 적립 검증"""
        # Given
        from app.v2.schemas.shared.cc_deposit import CCDepositCreate
        service = V2AdminCCDepositService()
        
        # When: 100,000원 입금
        deposit_data = CCDepositCreate(
            user_id=test_user.id,
            cc_id=test_user.cc_id,
            deposit_amount=100000,
            play_count=0,
            memo="test_xp"
        )
        service.upsert_many(db, [deposit_data])

        # Then: XP 적립 확인 (10만원당 20XP)
        db.refresh(test_user)
        assert test_user.xp >= 20


@pytest.mark.parametrize("xp_amount,expected_min_xp", [
    (50, 50),
    (100, 100),
    (200, 200),
])
def test_xp_accumulation(db: Session, test_user: V2User, xp_amount: int, expected_min_xp: int):
    """XP 누적 테스트"""
    # Given
    service = V2LevelXPService()
    
    # When
    service.add_xp(db, user_id=test_user.id, delta=xp_amount, source=f"test_{xp_amount}")
    db.commit()
    
    # Then
    db.refresh(test_user)
    assert test_user.xp >= expected_min_xp


@pytest.mark.parametrize("deposit_amount,expected_xp", [
    (100000, 20),    # 10만원 = 20XP
    (500000, 100),   # 50만원 = 100XP
    (1000000, 200),  # 100만원 = 200XP
])
def test_cc_deposit_xp_calculation(db: Session, test_user: V2User, deposit_amount: int, expected_xp: int):
    """CC Deposit XP 계산 규칙 검증: 10만원당 20XP"""
    # Given
    from app.v2.schemas.shared.cc_deposit import CCDepositCreate
    service = V2AdminCCDepositService()
    
    # When
    deposit_data = CCDepositCreate(
        user_id=test_user.id,
        cc_id=test_user.cc_id,
        deposit_amount=deposit_amount,
        play_count=0,
        memo=f"test_{deposit_amount}"
    )
    service.upsert_many(db, [deposit_data])
    
    # Then
    db.refresh(test_user)
    assert test_user.xp >= expected_xp
    assert test_user.total_charge_amount == deposit_amount
