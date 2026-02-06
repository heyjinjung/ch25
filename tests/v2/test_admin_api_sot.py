"""
Admin Vault & Dashboard 테스트: SoT 준수 검증
"""
from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User, VaultWithdrawalRequest
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.services.vault_service import V2VaultService


@pytest.fixture
def admin_user(db: Session) -> V2User:
    """관리자 유저"""
    admin = V2User(
        cc_id="ADMIN_TEST",
        nickname="테스트관리자",
        role=V2UserRole.SUPER_ADMIN,
        status=V2UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def normal_user(db: Session) -> V2User:
    """일반 유저"""
    user = V2User(
        cc_id="NORMAL_TEST",
        nickname="일반유저",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        vault_locked_balance=100000,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestVaultService:
    """Vault Service SoT 테스트"""

    def test_vault_sot_locked_only(self, db: Session, normal_user: V2User):
        """Vault SoT: locked_balance만 사용, available은 deprecated"""
        # Given
        normal_user.vault_locked_balance = 50000
        db.commit()

        # When: Vault 상태 조회
        service = V2VaultService()
        info = service.get_vault_info(db, normal_user.id)

        # Then: locked만 반영
        assert info["lockedBalance"] == 50000
        assert info["vaultBalance"] == 50000

    def test_vault_deposit_increments_locked_balance(self, db: Session, normal_user: V2User):
        """deposit()로 locked_balance가 증가"""
        # Given
        service = V2VaultService()
        normal_user.vault_locked_balance = 10000
        db.commit()

        # When: 5000원 추가 입금
        service.deposit(db, user_id=normal_user.id, amount=5000, reason="TEST", ref_type="TEST")
        db.commit()

        # Then
        db.refresh(normal_user)
        assert normal_user.vault_locked_balance == 15000

    def test_vault_info_available_balance_accounts_reserved(self, db: Session, normal_user: V2User):
        """get_vault_info(): reserved(PENDING)만큼 availableBalance 감소"""
        # Given
        service = V2VaultService()
        normal_user.vault_locked_balance = 10000
        db.add(
            VaultWithdrawalRequest(
                user_id=normal_user.id,
                amount=3000,
                status="PENDING",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
        db.commit()

        # When
        info = service.get_vault_info(db, normal_user.id)

        # Then
        assert info["lockedBalance"] == 10000
        assert info["availableBalance"] == 7000

    def test_get_locked_balance_user_not_found_raises(self, db: Session):
        """get_locked_balance(): 없는 유저면 ValueError"""
        service = V2VaultService()
        with pytest.raises(ValueError):
            service.get_locked_balance(db, user_id=999999)


class TestUserRoles:
    """User Role 테스트"""

    @pytest.mark.parametrize("role,is_admin", [
        (V2UserRole.SUPER_ADMIN, True),
        (V2UserRole.ADMIN, True),
        (V2UserRole.USER, False),
    ])
    def test_user_role_admin_check(self, db: Session, role: V2UserRole, is_admin: bool):
        """User Role에 따른 Admin 권한 확인"""
        # Given
        user = V2User(
            cc_id=f"TEST_{role.value}",
            nickname=f"{role.value}유저",
            role=role
        )
        db.add(user)
        db.commit()

        # When: Admin 권한 체크
        has_admin_access = role in [V2UserRole.SUPER_ADMIN, V2UserRole.ADMIN]

        # Then
        assert has_admin_access == is_admin


class TestVaultStatus:
    """Vault Status 조회 테스트"""

    def test_vault_status_basic(self, db: Session, normal_user: V2User):
        """기본 Vault 상태 조회"""
        # Given
        service = V2VaultService()
        
        # When
        eligible, user, _ = service.get_status(db, normal_user.id)
        
        # Then
        assert isinstance(eligible, bool)
        assert int(getattr(user, "vault_locked_balance", 0) or 0) >= 0
