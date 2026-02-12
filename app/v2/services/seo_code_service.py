"""SEO 일일 검색 미션 코드 서비스."""
import logging
import random
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.v2.models.core.seo_daily_code import SeoDailyCode, UserSeoDailyCodeClaim
from app.v2.services.reward_service import V2RewardService

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")


class V2SeoCodeService:
    """SEO 일일 검색 미션 코드 관리 서비스."""

    def __init__(self, db: Session):
        self.db = db
        self.reward_service = V2RewardService()

    # ── 오늘의 코드 조회 ──────────────────────────────────

    def get_today_code(self) -> SeoDailyCode | None:
        """오늘 날짜(KST)의 활성 코드를 반환한다."""
        today_kst = datetime.now(KST).date()
        return (
            self.db.query(SeoDailyCode)
            .filter(
                SeoDailyCode.target_date == today_kst,
                SeoDailyCode.is_active == True,
            )
            .first()
        )

    # ── 코드 검증 및 보상 지급 ────────────────────────────

    def claim_code(self, user_id: int, code_input: str) -> dict:
        """코드 입력 → 검증 → 보상 지급.

        Returns:
            {"success": True, "reward_amount": int, "message": str}

        Raises:
            ValueError: 코드 오류 시 (error_code 속성 포함)
        """
        # 대소문자 무관 처리 (항상 대문자로 변환하여 비교)
        code_upper = code_input.strip().upper()
        today_kst = datetime.now(KST).date()

        # 1) 코드 조회
        seo_code = (
            self.db.query(SeoDailyCode)
            .filter(
                SeoDailyCode.code == code_upper,
                SeoDailyCode.is_active == True,
            )
            .first()
        )
        if not seo_code:
            raise ValueError("INVALID_CODE")

        # 2) 날짜 확인 (오늘 코드인지)
        if seo_code.target_date != today_kst:
            raise ValueError("CODE_EXPIRED")

        # 3) 중복 입력 확인
        existing = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.seo_code_id == seo_code.id,
            )
            .first()
        )
        if existing:
            raise ValueError("ALREADY_CLAIMED")

        # 4) 오늘 이미 다른 SEO 코드를 사용했는지 (하루 1회 제한)
        today_start = datetime.combine(today_kst, datetime.min.time()).replace(tzinfo=KST)
        today_any_claim = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.claimed_at >= today_start,
            )
            .first()
        )
        if today_any_claim:
            raise ValueError("DAILY_LIMIT_REACHED")

        # 5) 랜덤 보상 결정
        reward_amount = random.randint(seo_code.reward_min, seo_code.reward_max)

        # 6) 포인트 지급
        self.reward_service.deliver(
            self.db,
            user_id=user_id,
            reward_type="POINT",
            reward_amount=reward_amount,
            meta={"reason": "SEO_DAILY_MISSION", "source": "SEO_SEARCH_CODE"},
        )

        # 7) 클레임 기록
        claim = UserSeoDailyCodeClaim(
            user_id=user_id,
            seo_code_id=seo_code.id,
            reward_amount=reward_amount,
            claimed_at=datetime.now(KST),
        )
        self.db.add(claim)
        self.db.commit()

        logger.info(
            "seo_code claimed: user_id=%s code=%s reward=%sP",
            user_id, code_upper, reward_amount,
        )

        return {
            "success": True,
            "reward_amount": reward_amount,
            "message": f"{reward_amount:,}P 지급 완료!",
        }

    # ── 오늘 클레임 여부 확인 ─────────────────────────────

    def get_today_status(self, user_id: int) -> dict:
        """오늘의 미션 상태를 반환한다.

        Returns:
            {"has_claimed_today": bool, "reward_amount": int|None, "code_hint": str|None}
        """
        today_kst = datetime.now(KST).date()
        today_start = datetime.combine(today_kst, datetime.min.time()).replace(tzinfo=KST)

        claim = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.claimed_at >= today_start,
            )
            .first()
        )

        return {
            "has_claimed_today": claim is not None,
            "reward_amount": claim.reward_amount if claim else None,
        }

    # ── 코드 생성 (Cron에서 호출) ─────────────────────────

    @staticmethod
    def generate_daily_code(db: Session, target_date: date) -> SeoDailyCode:
        """지정 날짜의 새 코드를 생성한다. 기존 코드는 비활성화."""
        # 기존 활성 코드 비활성화
        db.query(SeoDailyCode).filter(
            SeoDailyCode.is_active == True,
        ).update({"is_active": False})

        # 새 코드 생성 (영문 대문자 + 숫자, 총 8자리 — 사용자 입력 시 대소문자 무관)
        import string
        chars = string.ascii_uppercase + string.digits
        code = "SEO" + "".join(random.choices(chars, k=5))

        # 중복 방지 (극히 드문 경우)
        while db.query(SeoDailyCode).filter(SeoDailyCode.code == code).first():
            code = "SEO" + "".join(random.choices(chars, k=5))

        new_code = SeoDailyCode(
            code=code,
            target_date=target_date,
            reward_min=3000,
            reward_max=5000,
            is_active=True,
        )
        db.add(new_code)
        db.commit()
        db.refresh(new_code)

        logger.info("seo_daily_code generated: date=%s code=%s", target_date, code)
        return new_code
