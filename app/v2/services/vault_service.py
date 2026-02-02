from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select, case
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.v2.models import GameTokenType
from app.v2.models.user import V2User
from app.v2.models import VaultWithdrawalRequest
from app.v2.models import VaultLedger
from app.v2.models import ExternalRankingData
from app.v2.models import ExternalRankingDailyDepositDelta
from app.v2.models import UserActivity
from app.v2.models import VaultEarnEvent
from app.v2.services.user_service import V2UserService
from app.v2.services.vault2_service import Vault2Service
from app.v2.services.vault_legacy_bridge import (
    record_game_play_earn_event as _record_game_play_earn_event,
    handle_deposit_increase_signal as _handle_deposit_increase_signal,
)
import logging

logger = logging.getLogger(__name__)


class V2VaultService:
    @staticmethod
    def _to_utc(now: datetime) -> datetime:
        if now.tzinfo is None:
            return now.replace(tzinfo=timezone.utc)
        return now.astimezone(timezone.utc)

    @staticmethod
    def _get_last_deposit_date(db: Session, user_id: int) -> datetime | None:
        rank_data = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        if rank_data and rank_data.deposit_amount > 0:
            return rank_data.updated_at
        return None

    @staticmethod
    def get_user_vault_policy(db: Session, user: V2User, now: datetime) -> dict:
        """Determine strict vault policy status (Shim for legacy tests)."""
        now_dt = V2VaultService._to_utc(now)
        last_deposit = V2VaultService._get_last_deposit_date(db, user.id)
        
        status = "ACTIVE"
        multiplier = 1.0
        suspended = False
        
        total_charged = int(getattr(user, "total_charge_amount", 0) or 0)
        vault_limit = 0
        
        # New User Grace Period (from is_benefits_suspended logic)
        created_at = user.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_since_signup = (now_dt - created_at).days
        
        if days_since_signup < 7:
            # New users are always active
            pass
        else:
            anchor_date = V2VaultService._to_utc(last_deposit) if last_deposit else created_at
            days_since = (now_dt - anchor_date).days
            
            if days_since >= 7:
                status = "INACTIVE"
                multiplier = 0.1
                suspended = True
                vault_limit = 30000
            elif days_since >= 3:
                status = "WARNING"
                multiplier = 0.5

        if total_charged == 0:
            vault_limit = 30000

        return {
            "status": status,
            "recency_multiplier": multiplier,
            "benefits_suspended": suspended,
            "vault_max_limit": vault_limit
        }

    @staticmethod
    def get_locked_balance(db: Session, user_id: int) -> int:
        v2_balance = db.execute(select(V2User.vault_locked_balance).where(V2User.id == user_id)).scalar_one_or_none()
        if v2_balance is None:
            raise ValueError("user not found")
        return int(v2_balance)

    @staticmethod
    def deposit(
        db: Session,
        user_id: int,
        amount: int,
        reason: str = "DEPOSIT",
        ref_type: str = "SYSTEM",
    ) -> int:
        """금고 입금 및 VaultLedger 기록.
        
        Args:
            db: DB 세션
            user_id: 유저 ID
            amount: 입금 금액 (양수)
            reason: 입금 사유 (예: ADMIN_MANUAL, GAME_REWARD, STREAK_REWARD 등)
            ref_type: 참조 타입 (ADMIN, GAME, REWARD, SYSTEM 등)
        """
        from app.models.vault_ledger import VaultLedger
        from datetime import datetime

        if amount <= 0:
            raise ValueError("amount must be > 0")

        # === Circuit Breaker: Safety Check ===
        from app.v2.services.circuit_breaker_service import CircuitBreakerService
        CircuitBreakerService.check_and_incr(db, "VAULT", amount, user_id)

        v2_user = db.get(V2User, user_id)
        if v2_user is None:
            raise ValueError("user not found")

        primary_balance = int(v2_user.vault_locked_balance or 0)
        
        # === Strict Vault Policy: 30k Cap for Inactive Users ===
        is_suspended, _ = V2VaultService.is_benefits_suspended(db, user_id)
        if is_suspended:
            if primary_balance >= 30000:
                # Already at or over cap, skip additional deposit
                return primary_balance
            new_balance = min(primary_balance + int(amount), 30000)
        else:
            new_balance = primary_balance + int(amount)

        v2_user.vault_locked_balance = new_balance
        db.add(v2_user)

        # === VaultLedger 기록 ===
        db.add(VaultLedger(
            user_id=user_id,
            amount=int(amount),  # 입금은 양수
            balance_after=new_balance,
            reason=reason,
            ref_type=ref_type,
            created_at=datetime.utcnow(),
        ))

        db.flush()
        return int(new_balance)

    @staticmethod
    def withdraw(
        db: Session,
        user_id: int,
        amount: int,
        reason: str = "WITHDRAW",
        ref_type: str = "SYSTEM",
    ) -> int:
        """금고 출금 및 VaultLedger 기록.
        
        Args:
            db: DB 세션
            user_id: 유저 ID
            amount: 출금 금액 (양수)
            reason: 출금 사유 (예: ADMIN_WITHDRAW, GAME_BET 등)
            ref_type: 참조 타입 (ADMIN, GAME, SYSTEM 등)
        """
        from app.models.vault_ledger import VaultLedger
        from datetime import datetime

        if amount <= 0:
            raise ValueError("amount must be > 0")

        v2_user = db.get(V2User, user_id)
        if v2_user is None:
            raise ValueError("user not found")

        primary_balance = int(v2_user.vault_locked_balance or 0)
        if primary_balance < amount:
            raise ValueError("insufficient locked balance")

        new_balance = primary_balance - int(amount)

        v2_user.vault_locked_balance = new_balance
        db.add(v2_user)

        # === VaultLedger 기록 ===
        db.add(VaultLedger(
            user_id=user_id,
            amount=-int(amount),  # 출금은 음수
            balance_after=new_balance,
            reason=reason,
            ref_type=ref_type,
            created_at=datetime.utcnow(),
        ))

        db.flush()
        return int(new_balance)

    @staticmethod
    def _ensure_daily_vault_spent_reset(user: V2User, now: datetime) -> None:
        """운영일(KST 09:00 리셋) 기준으로 vault_spent_today를 리셋한다."""
        op_date = V2VaultService._operational_date_kst(now)
        op_date_str = op_date.strftime("%Y-%m-%d")
        if getattr(user, "vault_spent_reset_date", None) != op_date_str:
            user.vault_spent_today = 0
            user.vault_spent_reset_date = op_date_str

    @staticmethod
    def consume_locked_for_spend(
        db: Session,
        v2_user_id: int,
        amount: int,
        *,
        reason: str = "V2_SHOP_PURCHASE",
        now: datetime | None = None,
    ) -> int:
        """상점 구매 등 '소비'로 인한 금고 차감.

        - daily_vault_spent가 실제 소비를 반영하도록 누적
        - 운영일(KST 09:00) 기준으로 일일 리셋 처리
        - VaultLedger에 소비 내역 기록
        """
        if amount <= 0:
            raise ValueError("amount must be > 0")

        now_dt = now or datetime.utcnow()

        q = db.query(V2User).filter(V2User.id == v2_user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        v2_user = q.one_or_none()
        if v2_user is None:
            raise ValueError("user not found")

        current = int(getattr(v2_user, "vault_locked_balance", 0) or 0)
        if current < amount:
            raise ValueError("insufficient locked balance")

        v2_user.vault_locked_balance = current - int(amount)
        v2_user.vault_spent_total = int(getattr(v2_user, "vault_spent_total", 0) or 0) + int(amount)
        V2VaultService._ensure_daily_vault_spent_reset(v2_user, now_dt)
        v2_user.vault_spent_today = int(getattr(v2_user, "vault_spent_today", 0) or 0) + int(amount)
        db.add(v2_user)

        db.add(
            VaultLedger(
                user_id=v2_user_id,
                amount=-int(amount),
                balance_after=int(v2_user.vault_locked_balance or 0),
                reason=reason,
                ref_type="SHOP",
            )
        )

        db.flush()
        return int(v2_user.vault_locked_balance or 0)

    @staticmethod
    def _to_utc(now: datetime) -> datetime:
        if now.tzinfo is None:
            return now.replace(tzinfo=timezone.utc)
        return now.astimezone(timezone.utc)

    @staticmethod
    def _operational_date_kst(now: datetime) -> datetime.date:
        settings = get_settings()
        reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
        reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))

        now_utc = V2VaultService._to_utc(now)
        now_kst = now_utc.astimezone(tz)
        if now_kst.hour < reset_hour:
            return now_kst.date() - timedelta(days=1)
        return now_kst.date()

    @staticmethod
    def is_benefits_suspended(db: Session, user_id: int, now_dt: datetime | None = None) -> tuple[bool, int]:
        """유저가 혜택 제재 상태인지 확인 (7일간 무입금 시 제재).
        
        정책: v2_strict_vault_policy_sot_ko.md
        - 7일간 입금 합계가 0이면 benefits_suspended = True
        - **예외**: 가입 7일 이내 신규 유저는 제재 대상에서 제외
        
        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            now_dt: 기준 시각 (기본: 현재 UTC)
        
        Returns:
            (is_suspended, deposit_7d) tuple
            - is_suspended: 제재 여부
            - deposit_7d: 최근 7일 입금 합계
        """
        from app.v2.models.user import V2User
        
        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        elif now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)
        
        # === 신규 유저 예외 처리 (가입 7일 이내) ===
        user = db.query(V2User).filter(V2User.id == user_id).first()
        if user and user.created_at:
            created_at = user.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            days_since_signup = (now_dt - created_at).days
            if days_since_signup < 7:
                # 신규 유저는 제재 대상에서 제외
                return False, 0
        
        # 최근 7일 입금 합계 확인 (6일 전 ~ 오늘)
        seven_days_ago_date = (now_dt - timedelta(days=6)).date()
        
        deposit_7d = db.query(
            func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)
        ).filter(
            ExternalRankingDailyDepositDelta.user_id == user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
        ).scalar() or 0
        
        # 7일간 입금이 0이면 제재
        is_suspended = int(deposit_7d) < 1
        
        # [Latency Survival] Provisional Exception Check
        # 제재 대상으로 판명되었으나, 최근 24시간 내 유효한 증거(PENDING/PROVISIONAL)가 있다면 예외 허용
        if is_suspended:
            from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
            
            bypass_window = now_dt - timedelta(hours=24)
            valid_evidence_exists = db.query(V2UserDepositEvidence.id).filter(
                V2UserDepositEvidence.user_id == user_id,
                V2UserDepositEvidence.created_at >= bypass_window,
                V2UserDepositEvidence.status.in_([EvidenceStatus.PENDING, EvidenceStatus.PROVISIONAL])
            ).limit(1).scalar()
            
            if valid_evidence_exists:
                is_suspended = False
        
        return is_suspended, int(deposit_7d)

    @staticmethod
    def log_suspension_change(
        db: Session,
        user_id: int,
        was_suspended: bool,
        is_suspended: bool,
        deposit_7d: int,
        *,
        trigger: str = "DEPOSIT",
    ) -> None:
        """제재 상태 변경 로깅.

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            was_suspended: 이전 제재 상태
            is_suspended: 현재 제재 상태
            deposit_7d: 최근 7일 입금 합계
            trigger: 트리거 원인 (DEPOSIT, MANUAL, etc.)
        """
        if was_suspended == is_suspended:
            return  # 상태 변화 없음

        event_type = "SUSPENSION_REMOVED" if was_suspended and not is_suspended else "SUSPENSION_APPLIED"

        logger.info(
            f"[VAULT] Suspension change: user_id={user_id}, "
            f"was_suspended={was_suspended}, is_suspended={is_suspended}, "
            f"deposit_7d={deposit_7d}, trigger={trigger}"
        )

        # V2AdminAuditService를 통한 감사 로그 기록
        try:
            from app.v2.services import V2AdminAuditService
            V2AdminAuditService.log(
                db,
                admin_id=0,  # 시스템 자동 처리
                action=event_type,
                target_type="USER",
                target_id=str(user_id),
                before={"benefits_suspended": was_suspended},
                after={
                    "benefits_suspended": is_suspended,
                    "deposit_7d": deposit_7d,
                    "trigger": trigger,
                }
            )
        except Exception as e:
            logger.warning(f"[VAULT] Failed to log suspension change: {e}")

    @staticmethod
    def check_and_log_suspension_on_deposit(
        db: Session,
        user_id: int,
        *,
        before_deposit_7d: int | None = None,
    ) -> tuple[bool, int]:
        """입금 후 제재 상태 확인 및 변경 로깅.

        입금 후 호출하여 제재 상태가 해제되었는지 확인하고 로깅합니다.

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            before_deposit_7d: 입금 전 7일 합계 (없으면 0으로 간주하여 이전에 제재 상태였다고 가정)

        Returns:
            (is_suspended, deposit_7d) tuple
        """
        # 이전 상태 추정: before_deposit_7d가 0이면 제재 상태였음
        was_suspended = (before_deposit_7d or 0) < 1

        # 현재 상태 확인
        is_suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, user_id)

        # 상태 변경 로깅
        V2VaultService.log_suspension_change(
            db,
            user_id,
            was_suspended=was_suspended,
            is_suspended=is_suspended,
            deposit_7d=deposit_7d,
            trigger="DEPOSIT",
        )

        return is_suspended, deposit_7d

    def get_status(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, V2User, bool]:
        """V2 adapted get_status.

        SoT: V2User.vault_locked_balance.
        """
        v2s2 = Vault2Service()
        eligible = v2s2.get_eligibility(db, program_key=v2s2.DEFAULT_PROGRAM_KEY, user_id=user_id)

        user = db.get(V2User, user_id)
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # Sync legacy mirror for UI compatibility if needed
        # V2User uses individual fields, but we can set this attribute for the response object
        setattr(user, "vault_balance", int(user.vault_locked_balance or 0))
        return eligible, user, False

    def get_withdrawal_reserved_amount(self, db: Session, user_id: int) -> int:
        q = (
            db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0))
            .filter(VaultWithdrawalRequest.user_id == user_id, VaultWithdrawalRequest.status == "PENDING")
        )
        val = q.scalar() or 0
        return int(val)

    def get_vault_info(self, db: Session, user_id: int, now: datetime | None = None) -> dict:
        """Consolidated vault status info for V2 UI."""
        now_dt = now or datetime.utcnow()
        eligible, user, _ = self.get_status(db, user_id, now_dt)

        locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
        reserved_amount = self.get_withdrawal_reserved_amount(db=db, user_id=user_id)
        available_amount = max(locked_balance - reserved_amount, 0)

        # CC Deposit (External Ranking) check
        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        op_date_kst = self._operational_date_kst(now_dt)
        now_kst_date = now_dt.astimezone(tz).date()

        delta_today = (
            db.query(ExternalRankingDailyDepositDelta.deposit_delta)
            .filter(
                ExternalRankingDailyDepositDelta.user_id == user_id,
                ExternalRankingDailyDepositDelta.kst_date == op_date_kst,
            )
            .scalar()
            or 0
        )
        has_cc_deposit_today = int(delta_today) > 0

        if not has_cc_deposit_today:
            rank_data = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
            if rank_data and rank_data.deposit_amount > 0 and rank_data.updated_at:
                sync_dt_utc = rank_data.updated_at
                if sync_dt_utc.tzinfo is None:
                    sync_dt_utc = sync_dt_utc.replace(tzinfo=timezone.utc)
                if sync_dt_utc.astimezone(tz).date() == now_kst_date and rank_data.deposit_amount > (rank_data.daily_base_deposit or 0):
                    has_cc_deposit_today = True

        if not has_cc_deposit_today:
            activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
            if activity and activity.last_charge_at:
                last_charge_utc = activity.last_charge_at
                if last_charge_utc.tzinfo is None:
                    last_charge_utc = last_charge_utc.replace(tzinfo=timezone.utc)
                if last_charge_utc.astimezone(tz).date() == now_kst_date:
                    has_cc_deposit_today = True

        # Activity stats
        three_days_ago_ts = now_dt - timedelta(days=3)
        
        # Aggregated play count from all game logs (including 0-accrual plays)
        # 1. Legacy logs
        from app.v2.models import DiceLog
        from app.v2.models import RouletteLog
        from app.v2.models import LotteryLog
        
        l_dice = db.query(func.count(DiceLog.id)).filter(DiceLog.user_id == user_id, DiceLog.created_at >= three_days_ago_ts).scalar() or 0
        l_roul = db.query(func.count(RouletteLog.id)).filter(RouletteLog.user_id == user_id, RouletteLog.created_at >= three_days_ago_ts).scalar() or 0
        l_lott = db.query(func.count(LotteryLog.id)).filter(LotteryLog.user_id == user_id, LotteryLog.created_at >= three_days_ago_ts).scalar() or 0
        
        # 2. V2 logs
        from app.v2.models.v2_dice import V2DiceLog
        from app.v2.models.v2_roulette import V2RouletteLog
        from app.v2.models.v2_lottery import V2LotteryLog
        
        v2_dice = db.query(func.count(V2DiceLog.id)).filter(V2DiceLog.user_id == user_id, V2DiceLog.created_at >= three_days_ago_ts).scalar() or 0
        v2_roul = db.query(func.count(V2RouletteLog.id)).filter(V2RouletteLog.user_id == user_id, V2RouletteLog.created_at >= three_days_ago_ts).scalar() or 0
        v2_lott = db.query(func.count(V2LotteryLog.id)).filter(V2LotteryLog.user_id == user_id, V2LotteryLog.created_at >= three_days_ago_ts).scalar() or 0
        
        recent_play_count = int(l_dice + l_roul + l_lott + v2_dice + v2_roul + v2_lott)

        seven_days_ago_date = (now_dt - timedelta(days=6)).date()
        deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
            ExternalRankingDailyDepositDelta.user_id == user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
        ).scalar() or 0

        from app.v2.services.segment_service import V2SegmentService

        current_segment = V2SegmentService.get_current_segment(db, user_id)
        segments = [str(current_segment).upper()] if current_segment else []

        play_target = 30
        spend_target = 10000
        if "NEW" in segments:
            play_target = 100
            spend_target = 30000
        elif "AT_RISK" in segments:
            play_target = 100
            spend_target = 30000
        elif deposit_7d >= 3000000:
            play_target = 0
            spend_target = 0
        elif deposit_7d >= 500000:
            play_target = 15
            spend_target = 5000

        withdrawal_count = db.query(func.count(VaultWithdrawalRequest.id)).filter(
            VaultWithdrawalRequest.user_id == user_id,
            VaultWithdrawalRequest.status.in_(["PENDING", "APPROVED"]),
        ).scalar() or 0

        # Golden Hour
        v2s2 = Vault2Service()
        is_golden_hour_active = False
        golden_hour_multiplier = 1.0
        golden_hour_remaining_seconds = 0
        gh_cfg = v2s2.get_config_value(db, "golden_hour_config", {})
        if gh_cfg and gh_cfg.get("enabled"):
            override = gh_cfg.get("manual_override", "AUTO")
            if override == "FORCE_ON":
                is_golden_hour_active = True
            elif override == "FORCE_OFF":
                is_golden_hour_active = False
            else:
                now_kst = now_dt.astimezone(tz)
                current_time_str = now_kst.strftime("%H:%M:%S")
                start_str = gh_cfg.get("start_time_kst", "21:30:00")
                end_str = gh_cfg.get("end_time_kst", "22:30:00")
                if start_str <= current_time_str <= end_str:
                    is_golden_hour_active = True
                    try:
                        end_h, end_m, end_s = map(int, end_str.split(":"))
                        end_dt = now_kst.replace(hour=end_h, minute=end_m, second=end_s, microsecond=0)
                        if end_dt < now_kst:
                            end_dt += timedelta(days=1)
                        golden_hour_remaining_seconds = max(0, int((end_dt - now_kst).total_seconds()))
                    except Exception:
                        pass
            if is_golden_hour_active:
                golden_hour_multiplier = float(gh_cfg.get("multiplier", 2.0))

        show_modal_override = v2s2.get_config_value(db, "show_modal_override")

        from app.v2.services.inventory_service import V2InventoryService
        wallet = V2InventoryService.get_wallet_balances(db, user_id)
        
        # V2 Standard Names for Ticket Counting
        ticket_keys = [
            GameTokenType.ROULETTE_TICKET.value, # "ROULETTE_TICKET"
            GameTokenType.DICE_TICKET.value,     # "DICE_TICKET"
            GameTokenType.LOTTERY_TICKET.value,  # "LOTTERY_TICKET"
            GameTokenType.TRIAL_TICKET.value,     # "TRIAL_TICKET"
        ]
        # Legacy fallback if needed (though SoT says use standard names)
        legacy_keys = [
            GameTokenType.ROULETTE_COIN.value,
            GameTokenType.DICE_TOKEN.value,
            GameTokenType.TRIAL_TOKEN.value,
        ]
        
        ticket_count = 0
        for k in ticket_keys:
            ticket_count += wallet.get(k, 0)
        for k in legacy_keys:
            if k not in ticket_keys: # Avoid double counting if names were ever same, though here they aren't
                ticket_count += wallet.get(k, 0)

        # ---------------------------------------------------------------------
        # New Field: Today's Earnings (VaultLedger sum > 0 for operational day)
        # ---------------------------------------------------------------------
        # op_date_kst is a date object. We need start of day in UTC.
        # Simple approx: just check created_at >= (now_utc - 24h) or strictly align with KST op day?
        # User explicitly asked for "Today +8000". Strict KST op day matches daily reset logic.
        
        # Convert op_date_kst (date) to datetime range in UTC
        # op_date_kst starts at ResetHour KST (e.g. 09:00 KST)
        reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
        reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
        
        # Construct KST datetime for op_date_kst start
        op_start_kst = datetime(
            op_date_kst.year, op_date_kst.month, op_date_kst.day,
            reset_hour, 0, 0, tzinfo=tz
        )
        op_start_utc = op_start_kst.astimezone(timezone.utc).replace(tzinfo=None) # naive for DB

        today_earnings = db.query(func.coalesce(func.sum(VaultLedger.amount), 0)).filter(
            VaultLedger.user_id == user_id,
            VaultLedger.amount > 0,
            VaultLedger.created_at >= op_start_utc
        ).scalar() or 0

        # ---------------------------------------------------------------------
        # New Field: Next Tier Goal (Dynamic Withdrawal Goal)
        # ---------------------------------------------------------------------
        approved_count_val = db.query(func.count(VaultWithdrawalRequest.id)).filter(
            VaultWithdrawalRequest.user_id == user_id,
            VaultWithdrawalRequest.status == "APPROVED",
        ).scalar() or 0
        
        tier_minimums = [10_000, 10_000, 30_000, 50_000]
        tier_idx = min(int(approved_count_val), len(tier_minimums) - 1)
        next_min_balance = tier_minimums[tier_idx]

        return {
            "eligible": bool(eligible),
            "vaultBalance": int(getattr(user, "vault_balance", 0) or 0),
            "lockedBalance": int(locked_balance),
            "availableBalance": int(available_amount),
            "ticketCount": int(ticket_count),
            "is_golden_hour_active": bool(is_golden_hour_active),
            "golden_hour_multiplier": float(golden_hour_multiplier),
            "golden_hour_remaining_seconds": int(golden_hour_remaining_seconds),
            "showModalOverride": show_modal_override,
            "segment": current_segment,
            "daily_play_count": int(recent_play_count),
            "daily_play_target": int(play_target),
            "daily_vault_spent": int(getattr(user, "vault_spent_today", 0) or 0),
            "daily_vault_spent_target": int(spend_target),
            "daily_deposit_confirmed": bool(has_cc_deposit_today),
            "withdrawal_count": int(withdrawal_count),
            "today_earnings": int(today_earnings),
            "minimum_withdrawal_amount": int(next_min_balance),
        }

    # Backwards-compatible bridge for V1 VaultService APIs used by game engines.
    @staticmethod
    def record_game_play_earn_event(
        db: Session,
        *,
        user_id: int,
        game_type: str,
        game_log_id: int,
        token_type: str | None = None,
        outcome: str | None = None,
        payout_raw: dict | None = None,
        now: datetime | None = None,
    ) -> int:
        """Delegate to legacy VaultService.record_game_play_earn_event to keep game logic shared."""
        return _record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=game_type,
            game_log_id=game_log_id,
            token_type=token_type,
            outcome=outcome,
            payout_raw=payout_raw,
            now=now,
        )

    def handle_deposit_increase_signal(
        self,
        db: Session,
        *,
        user_id: int,
        deposit_delta: int,
        prev_amount: int,
        new_amount: int,
        now: datetime | None = None,
        commit: bool = True,
    ) -> int:
        """Process external ranking "deposit increased" signal."""
        return _handle_deposit_increase_signal(
            db,
            user_id=user_id,
            deposit_delta=deposit_delta,
            prev_amount=prev_amount,
            new_amount=new_amount,
            now=now,
            commit=commit,
        )

    # =========================================================================
    # Admin Operations
    # =========================================================================

    def get_admin_stats(self, db: Session) -> dict:
        """Get aggregate vault stats for admin dashboard.
        
        V2 정책: 09:00 KST 리셋 기준으로 통계 집계.
        """
        # V2: 9AM KST 기준으로 통계 집계 (자정 기준에서 변경)
        from app.utils.timezone import business_day_start, business_day_end
        
        KST = ZoneInfo("Asia/Seoul")
        now_kst = datetime.now(KST)
        
        # 비즈니스 일자 기준 (09:00 KST ~ 익일 08:59:59 KST)
        today_start_utc = business_day_start(now_kst).replace(tzinfo=None)
        today_end_utc = business_day_end(now_kst).replace(tzinfo=None)

        # Using sqlalchemy select/scalars for V2 standard
        today_total = db.execute(
            select(func.sum(V2User.vault_available_balance) + func.sum(V2User.vault_locked_balance))
        ).scalar() or 0

        today_approved = db.execute(
            select(func.sum(VaultWithdrawalRequest.amount))
            .where(
                VaultWithdrawalRequest.status == "APPROVED",
                VaultWithdrawalRequest.processed_at >= today_start_utc,
                VaultWithdrawalRequest.processed_at < today_end_utc
            )
        ).scalar() or 0

        today_rejected = db.execute(
            select(func.sum(VaultWithdrawalRequest.amount))
            .where(
                VaultWithdrawalRequest.status == "REJECTED",
                VaultWithdrawalRequest.processed_at >= today_start_utc,
                VaultWithdrawalRequest.processed_at < today_end_utc
            )
        ).scalar() or 0

        today_pending = db.execute(
            select(func.sum(VaultWithdrawalRequest.amount))
            .where(VaultWithdrawalRequest.status == "PENDING")
        ).scalar() or 0

        total_pending_count = db.execute(
            select(func.count(VaultWithdrawalRequest.id))
            .where(VaultWithdrawalRequest.status == "PENDING")
        ).scalar() or 0

        return {
            "today_total_vault": int(today_total),
            "today_withdrawal_pending": int(today_pending),
            "today_withdrawal_approved": int(today_approved),
            "today_withdrawal_rejected": int(today_rejected),
            "total_pending_count": int(total_pending_count),
        }

    def get_admin_users(self, db: Session, limit: int = 50, offset: int = 0, sort_by: str = "vault_balance") -> list:
        """List users with their vault summary for admin."""
        query = select(V2User)
        if sort_by == "vault_balance":
            order_col = func.coalesce(V2User.vault_available_balance, 0) + func.coalesce(V2User.vault_locked_balance, 0)
            query = query.order_by(order_col.desc())
        elif sort_by == "total_deposit":
            query = query.order_by(V2User.total_charge_amount.desc())
        else:
            query = query.order_by(V2User.updated_at.desc())

        users = db.execute(query.offset(offset).limit(limit)).scalars().all()
        result = []
        for user in users:
            vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)
            
            tier = "COMMON"
            charge_total = int(user.total_charge_amount or 0)
            if charge_total >= 10_000_000:
                tier = "VVIP"
            elif charge_total >= 5_000_000:
                tier = "VIP"

            total_withdrawal = db.execute(
                select(func.sum(VaultWithdrawalRequest.amount))
                .where(VaultWithdrawalRequest.user_id == user.id, VaultWithdrawalRequest.status == "APPROVED")
            ).scalar() or 0

            result.append({
                "user_id": user.id,
                "nickname": user.nickname or "(미설정)",
                "telegram_username": user.telegram_username,
                "vault_balance": vault_balance,
                "total_deposit": charge_total,
                "total_withdrawal": int(total_withdrawal),
                "last_activity": user.updated_at,
                "tier": tier,
            })
        return result

    def get_admin_user_ledger(self, db: Session, user_id: int, limit: int = 50, offset: int = 0) -> dict:
        """Get detailed vault ledger for a specific user."""
        from app.v2.models import VaultLedger
        user = db.get(V2User, user_id)
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # Sum IN/OUT
        # Note: case logic migrated to modern sqlalchemy
        total_in = db.execute(
            select(func.coalesce(func.sum(case((VaultLedger.amount > 0, VaultLedger.amount), else_=0)), 0))
            .where(VaultLedger.user_id == user_id)
        ).scalar() or 0
        total_out = db.execute(
            select(func.coalesce(func.sum(case((VaultLedger.amount < 0, VaultLedger.amount), else_=0)), 0))
            .where(VaultLedger.user_id == user_id)
        ).scalar() or 0

        entries = db.execute(
            select(VaultLedger)
            .where(VaultLedger.user_id == user_id)
            .order_by(VaultLedger.created_at.desc())
            .offset(offset).limit(limit)
        ).scalars().all()

        items = [{
            "id": e.id,
            "user_id": e.user_id,
            "amount": e.amount,
            "balance_after": e.balance_after,
            "reason": e.reason,
            "ref_type": e.ref_type,
            "created_at": e.created_at,
        } for e in entries]

        current_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

        return {
             "user_id": user.id,
             "nickname": user.nickname or "(미설정)",
             "total_in": int(total_in),
             "total_out": int(total_out),
             "net_change": int(total_in + total_out),
             "current_balance": current_balance,
             "items": items,
        }

    def force_edit(self, db: Session, admin_id: int, user_id: int, amount: int, reason: str) -> dict:
        """Forcefully edit user vault balance (Admin only)."""
        from app.v2.models import VaultLedger
        from app.v2.services.admin_audit_service import V2AdminAuditService
        from app.v2.models.user import V2User

        user = db.get(V2User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        current_available = int(user.vault_available_balance or 0)
        current_locked = int(user.vault_locked_balance or 0)
        before_balance = current_available + current_locked

        delta = int(amount)
        if before_balance + delta < 0:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")

        # Logic for locked/available split
        if delta >= 0:
            user.vault_locked_balance = current_locked + delta
        else:
            if current_locked + delta >= 0:
                user.vault_locked_balance = current_locked + delta
            else:
                remaining = delta + current_locked  # negative
                user.vault_locked_balance = 0
                user.vault_available_balance = current_available + remaining

        after_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)
        now = datetime.utcnow()

        db.add(VaultLedger(
            user_id=user.id,
            amount=delta,
            balance_after=int(user.vault_locked_balance or 0),
            reason=reason,
            ref_type="ADMIN_FORCE_EDIT",
            created_at=now,
        ))

        if delta < 0:
            db.add(VaultWithdrawalRequest(
                user_id=user.id,
                amount=abs(int(delta)),
                status="APPROVED",
                admin_memo=reason,
                processed_at=now,
                processed_by=admin_id,
                created_at=now,
            ))

        # Modern audit logging
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="VAULT_FORCE_EDIT",
            target_type="USER",
            target_id=str(user_id),
            before={"vault_balance": before_balance},
            after={
                "vault_balance": after_balance,
                "amount_change": delta,
                "reason": reason,
            },
            auto_commit=False
        )

        db.commit()
        return {
            "success": True,
            "user_id": user_id,
            "before_balance": before_balance,
            "after_balance": after_balance,
            "amount_change": delta,
        }

    def get_admin_trend(self, db: Session, days: int = 30) -> list:
        """Get daily vault trend for analytics."""
        from datetime import date
        today = date.today()
        result = []
        for i in range(days):
            target_date = today - timedelta(days=days - i - 1)
            
            # Using execute(select()) for V2
            day_withdrawals = db.execute(
                select(VaultWithdrawalRequest)
                .where(func.date(VaultWithdrawalRequest.created_at) == target_date)
            ).scalars().all()

            approved_ws = [w for w in day_withdrawals if w.status == "APPROVED"]
            withdrawal_count = len(approved_ws)
            withdrawal_amount = sum(w.amount for w in approved_ws)

            total_vault = db.execute(
                select(func.sum(V2User.vault_available_balance) + func.sum(V2User.vault_locked_balance))
            ).scalar() or 0

            result.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "total_vault": int(total_vault),
                "deposit_count": 0, # Placeholder or CC deposit integration?
                "withdrawal_count": withdrawal_count,
                "deposit_amount": 0,
                "withdrawal_amount": int(withdrawal_amount),
            })
        return result

    def get_admin_withdrawals(self, db: Session, status: str) -> dict:
        """Filter withdrawals for admin with KST range logic."""
        KST = ZoneInfo("Asia/Seoul")
        now_kst = datetime.now(KST)
        today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end_kst = today_start_kst + timedelta(days=1)
        
        today_start_utc = today_start_kst.astimezone(timezone.utc).replace(tzinfo=None)
        today_end_utc = today_end_kst.astimezone(timezone.utc).replace(tzinfo=None)
        
        query = select(VaultWithdrawalRequest)
        status_upper = status.upper()
        
        if status_upper == "PENDING":
            query = query.where(VaultWithdrawalRequest.status == "PENDING")
        elif status_upper == "APPROVED":
            query = query.where(
                VaultWithdrawalRequest.status == "APPROVED",
                VaultWithdrawalRequest.processed_at >= today_start_utc,
                VaultWithdrawalRequest.processed_at < today_end_utc
            )
        elif status_upper == "REJECTED":
            query = query.where(
                VaultWithdrawalRequest.status == "REJECTED",
                VaultWithdrawalRequest.processed_at >= today_start_utc,
                VaultWithdrawalRequest.processed_at < today_end_utc
            )

        withdrawals = db.execute(query.order_by(VaultWithdrawalRequest.created_at.desc())).scalars().all()
        
        items = []
        for w in withdrawals:
            user = db.get(V2User, w.user_id)
            items.append({
                "id": w.id,
                "user_id": w.user_id,
                "nickname": user.nickname if user else "(알 수 없음)",
                "telegram_username": user.telegram_username if user else None,
                "amount": w.amount,
                "status": w.status,
                "created_at": w.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "approved_at": w.processed_at.strftime("%Y-%m-%d %H:%M:%S") if (w.status == "APPROVED" and w.processed_at) else None,
                "rejected_at": w.processed_at.strftime("%Y-%m-%d %H:%M:%S") if (w.status == "REJECTED" and w.processed_at) else None,
                "rejection_reason": w.admin_memo if w.status == "REJECTED" else None,
            })
        
        return {
            "status": status,
            "count": len(items),
            "total_amount": sum(w.amount for w in withdrawals),
            "withdrawals": items
        }

    def request_withdrawal(self, db: Session, user_id: int, amount: int) -> dict:
        """V2 adapted withdrawal request (CC Deposit based)."""
        user = db.get(V2User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        if amount < 10_000:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MIN_WITHDRAWAL_AMOUNT_10000")

        now = datetime.now(timezone.utc)
        
        # Ensure daily spent reset before checking eligibility
        V2VaultService._ensure_daily_vault_spent_reset(user, now)

        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        op_date_kst = self._operational_date_kst(now)
        now_kst_date = now.astimezone(tz).date()

        # Check Eligibility (CC Deposit / Activity based)
        delta_today = (
            db.query(ExternalRankingDailyDepositDelta.deposit_delta)
            .filter(
                ExternalRankingDailyDepositDelta.user_id == user_id,
                ExternalRankingDailyDepositDelta.kst_date == op_date_kst,
            )
            .scalar()
            or 0
        )
        has_cc_deposit_today = int(delta_today) > 0

        if not has_cc_deposit_today:
            rank_data = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
            if rank_data and rank_data.deposit_amount > 0 and rank_data.updated_at:
                sync_dt_utc = rank_data.updated_at
                if sync_dt_utc.tzinfo is None:
                    sync_dt_utc = sync_dt_utc.replace(tzinfo=timezone.utc)
                if sync_dt_utc.astimezone(tz).date() == now_kst_date and rank_data.deposit_amount > (rank_data.daily_base_deposit or 0):
                    has_cc_deposit_today = True

        if not has_cc_deposit_today:
            activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
            if activity and activity.last_charge_at:
                last_charge_utc = activity.last_charge_at
                if last_charge_utc.tzinfo is None:
                    last_charge_utc = last_charge_utc.replace(tzinfo=timezone.utc)
                if last_charge_utc.astimezone(tz).date() == now_kst_date:
                    has_cc_deposit_today = True

        # 1. Strict Withdrawal Eligibility (SoT): deposit today + play target + spend target
        from app.v2.services.segment_service import V2SegmentService

        current_segment = V2SegmentService.get_current_segment(db, user_id)
        segments = [str(current_segment).upper()] if current_segment else []

        seven_days_ago_date = (now - timedelta(days=6)).date()
        deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
            ExternalRankingDailyDepositDelta.user_id == user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
        ).scalar() or 0

        play_target = 30
        spend_target = 10000
        if "NEW" in segments:
            play_target = 100
            spend_target = 30000
        elif "AT_RISK" in segments:
            play_target = 100
            spend_target = 30000
        elif deposit_7d >= 3000000:
            play_target = 0
            spend_target = 0
        elif deposit_7d >= 500000:
            play_target = 15
            spend_target = 5000

        # Deposit must be confirmed for the operational day (KST 09:00 reset)
        if not has_cc_deposit_today:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="DEPOSIT_REQUIRED_TODAY")

        # Play count must meet segment-based target (last 3 days)
        if play_target > 0:
            three_days_ago_ts = now - timedelta(days=3)

            from app.v2.models import DiceLog
            from app.v2.models import RouletteLog
            from app.v2.models import LotteryLog
            from app.v2.models.v2_dice import V2DiceLog
            from app.v2.models.v2_roulette import V2RouletteLog
            from app.v2.models.v2_lottery import V2LotteryLog

            l_dice = db.query(func.count(DiceLog.id)).filter(DiceLog.user_id == user_id, DiceLog.created_at >= three_days_ago_ts).scalar() or 0
            l_roul = db.query(func.count(RouletteLog.id)).filter(RouletteLog.user_id == user_id, RouletteLog.created_at >= three_days_ago_ts).scalar() or 0
            l_lott = db.query(func.count(LotteryLog.id)).filter(LotteryLog.user_id == user_id, LotteryLog.created_at >= three_days_ago_ts).scalar() or 0
            v2_dice = db.query(func.count(V2DiceLog.id)).filter(V2DiceLog.user_id == user_id, V2DiceLog.created_at >= three_days_ago_ts).scalar() or 0
            v2_roul = db.query(func.count(V2RouletteLog.id)).filter(V2RouletteLog.user_id == user_id, V2RouletteLog.created_at >= three_days_ago_ts).scalar() or 0
            v2_lott = db.query(func.count(V2LotteryLog.id)).filter(V2LotteryLog.user_id == user_id, V2LotteryLog.created_at >= three_days_ago_ts).scalar() or 0

            recent_play_count = int(l_dice + l_roul + l_lott + v2_dice + v2_roul + v2_lott)
            if recent_play_count < play_target:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"PLAY_COUNT_INSUFFICIENT_{play_target}")

        # Vault spent (today) must meet target
        daily_spent = int(getattr(user, "vault_spent_today", 0) or 0)
        if daily_spent < spend_target:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"VAULT_SPENT_INSUFFICIENT_{spend_target}")

        # 2. Tiered minimum balance requirement (SoT: 10k -> 10k -> 30k -> 50k)
        approved_count = (
            db.query(func.count(VaultWithdrawalRequest.id))
            .filter(
                VaultWithdrawalRequest.user_id == user_id,
                VaultWithdrawalRequest.status == "APPROVED",
            )
            .scalar()
            or 0
        )
        tier_minimums = [10_000, 10_000, 30_000, 50_000]
        tier_index = min(int(approved_count), len(tier_minimums) - 1)
        required_min_balance = tier_minimums[tier_index]

        if amount < required_min_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIN_WITHDRAWAL_AMOUNT_{required_min_balance}",
            )

        total = int(getattr(user, "vault_locked_balance", 0) or 0)


        # 3. Concurrency & Balance checks
        pending_exists = (
            db.query(func.count(VaultWithdrawalRequest.id))
            .filter(VaultWithdrawalRequest.user_id == user_id, VaultWithdrawalRequest.status == "PENDING")
            .scalar()
            or 0
        )
        if int(pending_exists) > 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="WITHDRAWAL_REQUEST_ALREADY_PENDING")
        reserved = self.get_withdrawal_reserved_amount(db=db, user_id=user_id)
        if total - reserved < amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INSUFFICIENT_FUNDS")

        req = VaultWithdrawalRequest(
            user_id=user_id,
            amount=amount,
            status="PENDING",
            created_at=now
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        return {
            "request_id": req.id,
            "status": req.status,
            "amount": req.amount,
            "created_at": req.created_at,
            "balance_after": max(total - reserved - amount, 0),
        }
