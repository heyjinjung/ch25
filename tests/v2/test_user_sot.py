"""V2 User SoT 핵심 테스트.

SoT 문서: docs/v2_specs/01_core/v2_user_sot_ko.md

테스트 범위:
- 금고 SoT 필드 (`vault_locked_balance`) 단일 원장 원칙
- V2 User 필수 필드 존재 확인
- Legacy 필드 신규 write 금지 검증
"""
import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User, UserGameWallet


class TestV2UserSoT:
    """V2 User SoT 검증."""

    def test_v2_user_has_vault_locked_balance(self, db: Session):
        """금고 SoT 필드 존재 확인."""
        user = V2User(
            cc_id="TEST_USER_001",
            nickname="테스트유저",
            vault_locked_balance=50000,
        )
        db.add(user)
        db.flush()
        # Add required wallet
        wallet = UserGameWallet(user_id=user.id, token_type="ROULETTE_TICKET", balance=0)
        db.add(wallet)
        db.flush()

        assert user.vault_locked_balance == 50000
        assert hasattr(user, "vault_locked_balance")

    def test_v2_user_required_fields(self, db: Session):
        """V2 User 필수 필드 검증."""
        user = V2User(
            cc_id="TEST_REQUIRED_001",
            nickname="필수필드테스트",
        )
        db.add(user)
        db.flush()
        wallet = UserGameWallet(user_id=user.id, token_type="ROULETTE_TICKET", balance=0)
        db.add(wallet)
        db.flush()

        # 필수 필드 존재
        assert user.id is not None
        assert user.cc_id == "TEST_REQUIRED_001"
        assert user.nickname == "필수필드테스트"
        assert user.created_at is not None
        assert user.updated_at is not None
        # 금고 기본값
        assert user.vault_locked_balance == 0

    def test_v2_user_vault_balance_update(self, db: Session):
        """금고 잔액 업데이트 테스트."""
        user = V2User(
            cc_id="TEST_VAULT_001",
            vault_locked_balance=10000,
        )
        db.add(user)
        db.flush()

        # 금고 적립
        db.add(UserGameWallet(user_id=user.id, token_type="ROULETTE_TICKET", balance=0))
        user.vault_locked_balance += 5000
        db.flush()
        assert user.vault_locked_balance == 15000

        # 금고 차감
        user.vault_locked_balance -= 3000
        db.flush()
        assert user.vault_locked_balance == 12000

    def test_v2_user_cc_id_unique(self, db: Session):
        """CC_ID 유니크 제약 검증."""
        user1 = V2User(cc_id="UNIQUE_TEST_001")
        db.add(user1)
        db.flush()

        user2 = V2User(cc_id="UNIQUE_TEST_001")
        db.add(user2)
        
        with pytest.raises(Exception):  # IntegrityError
            db.flush()

    def test_v2_user_telegram_id_nullable(self, db: Session):
        """Telegram ID nullable 확인."""
        user = V2User(
            cc_id="TG_NULL_TEST",
            telegram_id=None,
            telegram_username=None,
        )
        db.add(user)
        db.flush()
        db.add(UserGameWallet(user_id=user.id, token_type="ROULETTE_TICKET", balance=0))
        db.flush()

        assert user.telegram_id is None
        assert user.telegram_username is None
