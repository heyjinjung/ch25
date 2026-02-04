"""
V2 보상 엣지케이스 테스트

출처:
- docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md
- docs/v2_specs/90_troubleshooting/20260204_reward_service_refactor_and_test_reset.md

테스트 대상:
1. 번들 보상 다양화 (3,6,7,12,15,20,30)
2. GAME_XP → Season Pass XP 연동
3. POINT vs CC_POINT 라우팅
4. Gifticon 타입/금액 검증
5. Vault 이익 정지 상태 체크
6. 보상 메타데이터 추적
"""

from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import patch, MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.exceptions import InvalidConfigError
from app.db.base_class import Base
from app.v2.models.user import V2User
from app.v2.services.reward_service import V2RewardService


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def _create_user(db: Session, user_id: int) -> V2User:
    """테스트용 유저 생성"""
    user = V2User(
        id=user_id,
        cc_id=f"reward_test_{user_id}",
        nickname=f"RewardTest{user_id}",
        telegram_id=f"tg_{user_id}",
        created_at=datetime.now(timezone.utc) - timedelta(days=30),
        total_charge_amount=10000,
        vault_locked_balance=0,
    )
    db.add(user)
    db.commit()
    return user


# =============================================================================
# 1. 번들 보상 다양화 테스트
# =============================================================================

class TestBundleRewardExpansion:
    """
    출처: reward_service.py §번들 보상 매핑

    BUNDLE_MAP:
    - 3: ROULETTE(1) + DICE(1) + LOTTERY(1)
    - 6: ROULETTE(3) + DICE(3)
    - 7: POINT(10000) + GOLD_KEY(1)
    - 12: ROULETTE(5) + DICE(5) + LOTTERY(2)
    - 15: POINT(100000) + GOLD_KEY(2)
    - 20: POINT(300000) + DIAMOND_TICKET(3)
    - 30: ROULETTE(10) + DICE(10) + LOTTERY(10)
    """

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_3_expands_correctly(self, mock_grant, db_session: Session):
        """번들(3): ROULETTE(1) + DICE(1) + LOTTERY(1)"""
        mock_grant.return_value = 1
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=3,
            meta={"reason": "TEST"},
        )

        # 3개 티켓 각각 지급됨
        assert mock_grant.call_count == 3

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_6_expands_correctly(self, mock_grant, db_session: Session):
        """번들(6): ROULETTE(3) + DICE(3)"""
        mock_grant.return_value = 3
        user = _create_user(db_session, 2)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=6,
            meta={"reason": "TEST"},
        )

        # ROULETTE(3) + DICE(3) = 2번 호출
        assert mock_grant.call_count == 2

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_7_expands_correctly(self, mock_grant, db_session: Session):
        """번들(7): POINT(10000) + GOLD_KEY(1)"""
        mock_grant.return_value = 1
        user = _create_user(db_session, 3)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=7,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        # POINT(10000) = vault_locked_balance 증가
        assert user.vault_locked_balance >= 10000
        # GOLD_KEY(1) = 인벤토리 지급
        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_12_expands_correctly(self, mock_grant, db_session: Session):
        """번들(12): ROULETTE(5) + DICE(5) + LOTTERY(2)"""
        mock_grant.return_value = 5
        user = _create_user(db_session, 4)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=12,
            meta={"reason": "TEST"},
        )

        # 3종류 티켓 지급
        assert mock_grant.call_count == 3

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_15_expands_correctly(self, mock_grant, db_session: Session):
        """번들(15): POINT(100000) + GOLD_KEY(2)"""
        mock_grant.return_value = 2
        user = _create_user(db_session, 5)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=15,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        # POINT(100000) = vault_locked_balance 증가
        assert user.vault_locked_balance >= 100000

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_20_expands_correctly(self, mock_grant, db_session: Session):
        """번들(20): POINT(300000) + DIAMOND_TICKET(3)"""
        mock_grant.return_value = 3
        user = _create_user(db_session, 6)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=20,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        # POINT(300000) = vault_locked_balance 증가
        assert user.vault_locked_balance >= 300000

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_bundle_30_expands_correctly(self, mock_grant, db_session: Session):
        """번들(30): ROULETTE(10) + DICE(10) + LOTTERY(10)"""
        mock_grant.return_value = 10
        user = _create_user(db_session, 7)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="BUNDLE",
            reward_amount=30,
            meta={"reason": "TEST"},
        )

        # 3종류 티켓 각 10개 지급
        assert mock_grant.call_count == 3


# =============================================================================
# 2. GAME_XP → Season Pass XP 연동 테스트
# =============================================================================

class TestGameXPRouting:
    """
    출처: reward_service.py §GAME_XP 라우팅

    규칙:
    - GAME_XP → V2SeasonPassService.add_bonus_xp()
    """

    @patch("app.v2.services.season_pass_service.V2SeasonPassService.add_bonus_xp")
    def test_game_xp_routes_to_season_pass(self, mock_add_xp, db_session: Session):
        """GAME_XP는 Season Pass로 라우팅"""
        mock_add_xp.return_value = {"success": True}
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GAME_XP",
            reward_amount=500,
            meta={"reason": "TEST"},
        )

        mock_add_xp.assert_called_once()
        call_args = mock_add_xp.call_args
        assert call_args[1]["xp_amount"] == 500 or call_args[0][2] == 500


# =============================================================================
# 3. POINT vs CC_POINT 라우팅 테스트
# =============================================================================

class TestPointRouting:
    """
    출처: reward_service.py §POINT 라우팅

    규칙:
    - POINT → vault_locked_balance 증가
    - CC_POINT → vault_locked_balance 증가 (동일 경로)
    """

    def test_point_routes_to_vault_locked(self, db_session: Session):
        """POINT는 vault_locked_balance로 라우팅"""
        user = _create_user(db_session, 1)
        initial_balance = user.vault_locked_balance

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="POINT",
            reward_amount=5000,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        assert user.vault_locked_balance == initial_balance + 5000

    def test_cc_point_routes_to_vault_locked(self, db_session: Session):
        """CC_POINT는 vault_locked_balance로 라우팅"""
        user = _create_user(db_session, 2)
        initial_balance = user.vault_locked_balance

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="CC_POINT",
            reward_amount=10000,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        assert user.vault_locked_balance == initial_balance + 10000


# =============================================================================
# 4. Gifticon 타입/금액 검증 테스트
# =============================================================================

class TestGifticonValidation:
    """
    출처: reward_service.py §Gifticon 검증

    허용 금액:
    - GIFTICON_BAEMIN: 5000, 10000, 20000
    - GIFTICON_COMPOSE: 3000
    """

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_baemin_5000_valid(self, mock_grant, db_session: Session):
        """배민 기프티콘 5000원 유효"""
        mock_grant.return_value = True
        user = _create_user(db_session, 1)

        # 예외 없이 실행되어야 함
        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GIFTICON_BAEMIN",
            reward_amount=5000,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_baemin_10000_valid(self, mock_grant, db_session: Session):
        """배민 기프티콘 10000원 유효"""
        mock_grant.return_value = True
        user = _create_user(db_session, 2)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GIFTICON_BAEMIN",
            reward_amount=10000,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_baemin_20000_valid(self, mock_grant, db_session: Session):
        """배민 기프티콘 20000원 유효"""
        mock_grant.return_value = True
        user = _create_user(db_session, 3)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GIFTICON_BAEMIN",
            reward_amount=20000,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    def test_baemin_invalid_amount_rejected(self, db_session: Session):
        """배민 기프티콘 미등록 금액 거부"""
        user = _create_user(db_session, 4)

        with pytest.raises(InvalidConfigError) as exc:
            V2RewardService().deliver(
                db_session, user.id,
                reward_type="GIFTICON_BAEMIN",
                reward_amount=7000,  # 미등록 금액
                meta={"reason": "TEST"},
            )
        assert exc.value.detail == "INVALID_GIFTICON_AMOUNT"

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_compose_3000_valid(self, mock_grant, db_session: Session):
        """컴포즈 기프티콘 3000원 유효"""
        mock_grant.return_value = True
        user = _create_user(db_session, 5)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GIFTICON_COMPOSE",
            reward_amount=3000,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()


# =============================================================================
# 5. 보상 타입별 라우팅 테스트
# =============================================================================

class TestRewardTypeRouting:
    """
    출처: v2_reward_mapping_sot_ko.md §보상 타입별 지급 경로
    """

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_roulette_ticket_routes_to_inventory(self, mock_grant, db_session: Session):
        """ROULETTE_TICKET는 인벤토리로 라우팅"""
        mock_grant.return_value = 3
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="ROULETTE_TICKET",
            reward_amount=3,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_dice_ticket_routes_to_inventory(self, mock_grant, db_session: Session):
        """DICE_TICKET는 인벤토리로 라우팅"""
        mock_grant.return_value = 5
        user = _create_user(db_session, 2)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="DICE_TICKET",
            reward_amount=5,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_lottery_ticket_routes_to_inventory(self, mock_grant, db_session: Session):
        """LOTTERY_TICKET는 인벤토리로 라우팅"""
        mock_grant.return_value = 2
        user = _create_user(db_session, 3)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="LOTTERY_TICKET",
            reward_amount=2,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_gold_key_ticket_routes_to_inventory(self, mock_grant, db_session: Session):
        """GOLD_KEY_TICKET는 인벤토리로 라우팅"""
        mock_grant.return_value = 1
        user = _create_user(db_session, 4)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="GOLD_KEY_TICKET",
            reward_amount=1,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_diamond_routes_to_inventory(self, mock_grant, db_session: Session):
        """DIAMOND는 인벤토리로 라우팅"""
        mock_grant.return_value = 10
        user = _create_user(db_session, 5)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="DIAMOND",
            reward_amount=10,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()


# =============================================================================
# 6. 보상 검증 테스트
# =============================================================================

class TestRewardValidation:
    """
    출처: reward_service.py §입력값 검증

    규칙:
    - 음수 보상량 거부
    - 0 보상량 조기 반환 (no-op)
    - NONE 타입 조기 반환 (no-op)
    """

    def test_negative_amount_rejected(self, db_session: Session):
        """음수 보상량 거부"""
        user = _create_user(db_session, 1)

        with pytest.raises(InvalidConfigError) as exc:
            V2RewardService().deliver(
                db_session, user.id,
                reward_type="POINT",
                reward_amount=-1000,
                meta={"reason": "TEST"},
            )
        assert exc.value.detail == "INVALID_POINT_AMOUNT"

    def test_zero_amount_no_op(self, db_session: Session):
        """0 보상량은 조기 반환 (no-op)"""
        user = _create_user(db_session, 2)
        initial_balance = user.vault_locked_balance

        # 예외 없이 실행되고 잔액 변화 없음
        V2RewardService().deliver(
            db_session, user.id,
            reward_type="POINT",
            reward_amount=0,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        assert user.vault_locked_balance == initial_balance

    def test_none_type_no_op(self, db_session: Session):
        """NONE 타입은 조기 반환 (no-op)"""
        user = _create_user(db_session, 3)
        initial_balance = user.vault_locked_balance

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="NONE",
            reward_amount=1000,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        assert user.vault_locked_balance == initial_balance

    def test_empty_type_no_op(self, db_session: Session):
        """빈 문자열 타입은 조기 반환 (no-op)"""
        user = _create_user(db_session, 4)
        initial_balance = user.vault_locked_balance

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="",
            reward_amount=1000,
            meta={"reason": "TEST"},
        )

        db_session.refresh(user)
        assert user.vault_locked_balance == initial_balance


# =============================================================================
# 8. 보상 메타데이터 추적 테스트
# =============================================================================

class TestRewardMetadata:
    """
    출처: reward_service.py §보상 메타데이터

    규칙:
    - reason, label, source 등 메타데이터 정확히 기록
    """

    def test_point_reward_with_meta(self, db_session: Session):
        """POINT 보상 메타데이터 기록"""
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="POINT",
            reward_amount=3000,
            meta={
                "reason": "MISSION_REWARD",
                "label": "daily_login",
                "source": "mission_service",
            },
        )

        # 메타데이터가 정확히 전달되었는지는 ledger 로그로 확인 가능
        # 여기서는 예외 없이 실행됨을 확인
        db_session.refresh(user)
        assert user.vault_locked_balance == 3000


# =============================================================================
# 9. 티켓 번들 테스트
# =============================================================================

class TestTicketBundle:
    """
    출처: reward_service.py §TICKET_BUNDLE

    규칙:
    - TICKET_BUNDLE = BUNDLE과 동일 처리
    """

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_ticket_bundle_same_as_bundle(self, mock_grant, db_session: Session):
        """TICKET_BUNDLE은 BUNDLE과 동일하게 처리"""
        mock_grant.return_value = 1
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="TICKET_BUNDLE",
            reward_amount=3,
            meta={"reason": "TEST"},
        )

        # BUNDLE(3)과 동일하게 3개 티켓 지급
        assert mock_grant.call_count == 3


# =============================================================================
# 10. 특수 보상 타입 테스트
# =============================================================================

class TestSpecialRewardTypes:
    """
    출처: v2_reward_mapping_sot_ko.md §특수 보상 타입
    """

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_wallet_tokens")
    def test_diamond_ticket_reward(self, mock_grant, db_session: Session):
        """DIAMOND_TICKET 보상"""
        mock_grant.return_value = 2
        user = _create_user(db_session, 1)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="DIAMOND_TICKET",
            reward_amount=2,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_chicken_gifticon_5000(self, mock_grant, db_session: Session):
        """CHICKEN_GIFTICON_5000 보상"""
        mock_grant.return_value = True
        user = _create_user(db_session, 2)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="CHICKEN_GIFTICON_5000",
            reward_amount=1,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()

    @patch("app.v2.services.inventory_service.V2InventoryService.grant_item")
    def test_starbucks_gifticon_10000(self, mock_grant, db_session: Session):
        """STARBUCKS_GIFTICON_10000 보상"""
        mock_grant.return_value = True
        user = _create_user(db_session, 3)

        V2RewardService().deliver(
            db_session, user.id,
            reward_type="STARBUCKS_GIFTICON_10000",
            reward_amount=1,
            meta={"reason": "TEST"},
        )

        mock_grant.assert_called()
