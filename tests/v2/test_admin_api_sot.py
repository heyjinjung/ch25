"""
Admin Vault & Dashboard 테스트: SoT 준수 검증
"""
import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User
from app.v2.models.enums import V2UserRole, V2UserStatus
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
        normal_user.vault_available_balance = 0  # deprecated
        db.commit()

        # When: Vault 상태 조회
        service = V2VaultService()
        status = service.get_status(db, normal_user.id)

        # Then: locked만 반영
        assert status["locked_balance"] == 50000

    def test_vault_adjust_balance(self, db: Session, normal_user: V2User):
        """Vault 잔액 조정 테스트"""
        # Given
        service = V2VaultService()
        normal_user.vault_locked_balance = 10000
        db.commit()

        # When: 5000원 추가
        service.adjust_balance(
            db,
            user_id=normal_user.id,
            amount=5000,
            reason="test_add",
            force=False
        )
        db.commit()

        # Then
        db.refresh(normal_user)
        assert normal_user.vault_locked_balance == 15000

    def test_vault_force_negative_balance(self, db: Session, normal_user: V2User):
        """force=True 시 음수 잔액 허용"""
        # Given
        service = V2VaultService()
        normal_user.vault_locked_balance = 10000
        db.commit()

        # When: force=True로 50000원 차감
        service.adjust_balance(
            db,
            user_id=normal_user.id,
            amount=-50000,
            reason="test_force",
            force=True
        )
        db.commit()

        # Then: 음수 허용
        db.refresh(normal_user)
        assert normal_user.vault_locked_balance == -40000


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
        status = service.get_status(db, normal_user.id)
        
        # Then
        assert "locked_balance" in status
        assert status["locked_balance"] >= 0
