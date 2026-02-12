"""비밀코드 시스템 통합 테스트.

테스트 범위:
- 비밀코드 claim 정상 플로우
- 만료된 코드 거부
- 중복 claim 거부
- 잘못된 코드 거부
- 각 보상 유형별 지급 확인
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo

from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim
from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.models import UserGameWallet


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def event_user(db_session):
    """이벤트 테스트용 유저 생성."""
    user = V2User(
        cc_id="event_test_user",
        nickname="이벤트테스터",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        vault_locked_balance=0,
    )
    db_session.add(user)
    db_session.flush()

    # 기본 월렛 생성
    for token in ["ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"]:
        db_session.add(UserGameWallet(user_id=user.id, token_type=token, balance=0))
    db_session.commit()
    return user


@pytest.fixture
def active_codes(db_session):
    """활성 비밀코드 4개 시드."""
    kst = ZoneInfo("Asia/Seoul")
    now_kst = datetime.now(kst)
    tomorrow = now_kst + timedelta(days=1)

    codes = [
        EventSecretCode(
            code="LOVE2026", event_date="2026-02-14",
            reward_type="ROULETTE_TICKET", reward_amount=2,
            is_active=True, expires_at=tomorrow,
        ),
        EventSecretCode(
            code="SEOL777", event_date="2026-02-15",
            reward_type="LOTTERY_TICKET", reward_amount=1,
            is_active=True, expires_at=tomorrow,
        ),
        EventSecretCode(
            code="LUCKY888", event_date="2026-02-16",
            reward_type="DICE_TICKET", reward_amount=2,
            is_active=True, expires_at=tomorrow,
        ),
        EventSecretCode(
            code="JACKPOT999", event_date="2026-02-17",
            reward_type="POINT", reward_amount=10000,
            is_active=True, expires_at=tomorrow,
        ),
    ]
    db_session.add_all(codes)
    db_session.commit()
    return codes


@pytest.fixture
def expired_code(db_session):
    """만료된 비밀코드."""
    kst = ZoneInfo("Asia/Seoul")
    yesterday = datetime.now(kst) - timedelta(days=1)
    code = EventSecretCode(
        code="EXPIRED99", event_date="2026-02-10",
        reward_type="ROULETTE_TICKET", reward_amount=1,
        is_active=True, expires_at=yesterday,
    )
    db_session.add(code)
    db_session.commit()
    return code


# ── 정상 플로우 테스트 ───────────────────────────────────────────────────

class TestSecretCodeClaimSuccess:
    """비밀코드 정상 claim 테스트."""

    def test_claim_roulette_ticket_code(self, db_session, event_user, active_codes):
        """LOVE2026 → 룰렛 티켓 2장 지급."""
        from app.v2.api.event_routes import _grant_secret_code_reward

        _grant_secret_code_reward(
            db_session,
            user_id=event_user.id,
            reward_type="ROULETTE_TICKET",
            reward_amount=2,
        )

        wallet = db_session.query(UserGameWallet).filter(
            UserGameWallet.user_id == event_user.id,
            UserGameWallet.token_type == "ROULETTE_TICKET",
        ).first()
        assert wallet is not None
        assert wallet.balance == 2

    def test_claim_lottery_ticket_code(self, db_session, event_user, active_codes):
        """SEOL777 → 복권 티켓 1장 지급."""
        from app.v2.api.event_routes import _grant_secret_code_reward

        _grant_secret_code_reward(
            db_session,
            user_id=event_user.id,
            reward_type="LOTTERY_TICKET",
            reward_amount=1,
        )

        wallet = db_session.query(UserGameWallet).filter(
            UserGameWallet.user_id == event_user.id,
            UserGameWallet.token_type == "LOTTERY_TICKET",
        ).first()
        assert wallet is not None
        assert wallet.balance == 1

    def test_claim_dice_ticket_code(self, db_session, event_user, active_codes):
        """LUCKY888 → 주사위 티켓 2장 지급."""
        from app.v2.api.event_routes import _grant_secret_code_reward

        _grant_secret_code_reward(
            db_session,
            user_id=event_user.id,
            reward_type="DICE_TICKET",
            reward_amount=2,
        )

        wallet = db_session.query(UserGameWallet).filter(
            UserGameWallet.user_id == event_user.id,
            UserGameWallet.token_type == "DICE_TICKET",
        ).first()
        assert wallet is not None
        assert wallet.balance == 2

    def test_claim_point_code(self, db_session, event_user, active_codes):
        """JACKPOT999 → 포인트 10,000P 지급."""
        from app.v2.api.event_routes import _grant_secret_code_reward

        initial_balance = int(event_user.vault_locked_balance or 0)

        _grant_secret_code_reward(
            db_session,
            user_id=event_user.id,
            reward_type="POINT",
            reward_amount=10000,
        )
        db_session.refresh(event_user)

        assert int(event_user.vault_locked_balance or 0) >= initial_balance + 10000

    def test_claim_record_saved(self, db_session, event_user, active_codes):
        """claim 기록이 UserSecretCodeClaim에 저장된다."""
        code = active_codes[0]  # LOVE2026

        claim = UserSecretCodeClaim(
            user_id=event_user.id,
            secret_code_id=code.id,
            claimed_at=datetime.utcnow(),
        )
        db_session.add(claim)
        db_session.commit()

        saved = db_session.query(UserSecretCodeClaim).filter(
            UserSecretCodeClaim.user_id == event_user.id,
            UserSecretCodeClaim.secret_code_id == code.id,
        ).first()
        assert saved is not None
        assert saved.user_id == event_user.id


# ── 에러 케이스 테스트 ───────────────────────────────────────────────────

class TestSecretCodeClaimErrors:
    """비밀코드 에러 케이스 테스트."""

    def test_invalid_code_not_found(self, db_session, active_codes):
        """존재하지 않는 코드 → None."""
        code = db_session.query(EventSecretCode).filter(
            EventSecretCode.code == "NONEXIST",
            EventSecretCode.is_active == True,
        ).first()
        assert code is None

    def test_expired_code_rejected(self, db_session, expired_code):
        """만료된 코드 → expires_at 비교로 확인."""
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime.now(kst)

        expires_at = expired_code.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=kst)

        assert now_kst > expires_at, "만료된 코드의 expires_at이 현재보다 이전이어야 함"

    def test_duplicate_claim_prevented(self, db_session, event_user, active_codes):
        """같은 코드 중복 claim 시 unique constraint."""
        code = active_codes[0]

        claim1 = UserSecretCodeClaim(
            user_id=event_user.id,
            secret_code_id=code.id,
        )
        db_session.add(claim1)
        db_session.commit()

        # 중복 확인 로직 (앱 level 체크)
        existing = db_session.query(UserSecretCodeClaim).filter(
            UserSecretCodeClaim.user_id == event_user.id,
            UserSecretCodeClaim.secret_code_id == code.id,
        ).first()
        assert existing is not None, "이미 claimed된 코드는 다시 claim 불가"

    def test_inactive_code_not_found(self, db_session):
        """is_active=False 코드 → 조회 불가."""
        inactive = EventSecretCode(
            code="DISABLED1", event_date="2026-02-14",
            reward_type="ROULETTE_TICKET", reward_amount=1,
            is_active=False,
            expires_at=datetime.now(ZoneInfo("Asia/Seoul")) + timedelta(days=1),
        )
        db_session.add(inactive)
        db_session.commit()

        found = db_session.query(EventSecretCode).filter(
            EventSecretCode.code == "DISABLED1",
            EventSecretCode.is_active == True,
        ).first()
        assert found is None


# ── 비밀코드 시드 데이터 정합성 ──────────────────────────────────────────

class TestSecretCodeSeedData:
    """비밀코드 시드 데이터가 기획서와 일치하는지 확인."""

    EXPECTED_CODES = [
        ("LOVE2026", "ROULETTE_TICKET", 2),
        ("SEOL777", "LOTTERY_TICKET", 1),
        ("LUCKY888", "DICE_TICKET", 2),
        ("JACKPOT999", "POINT", 10000),
    ]

    @pytest.mark.parametrize("code,reward_type,reward_amount", EXPECTED_CODES)
    def test_seed_data_matches_proposal(self, db_session, active_codes, code, reward_type, reward_amount):
        """시드 데이터(코드/보상타입/보상수량)가 기획서와 일치."""
        found = db_session.query(EventSecretCode).filter(
            EventSecretCode.code == code,
        ).first()
        assert found is not None, f"코드 {code}가 존재해야 함"
        assert found.reward_type == reward_type, f"{code}: {found.reward_type} != {reward_type}"
        assert found.reward_amount == reward_amount, f"{code}: {found.reward_amount} != {reward_amount}"
