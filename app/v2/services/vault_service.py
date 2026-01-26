from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.models.game_wallet import GameTokenType
from app.v2.models.user import V2User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.vault_ledger import VaultLedger
from app.models.external_ranking import ExternalRankingData
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.user_activity import UserActivity
from app.models.vault_earn_event import VaultEarnEvent
from app.v2.services.user_service import V2UserService
from app.v2.services.vault2_service import Vault2Service
from app.v2.services.vault_legacy_bridge import (
    record_game_play_earn_event as _record_game_play_earn_event,
    handle_deposit_increase_signal as _handle_deposit_increase_signal,
)


class V2VaultService:
    @staticmethod
    def get_locked_balance(db: Session, user_id: int) -> int:
        legacy = db.execute(select(User.vault_locked_balance).where(User.id == user_id)).scalar_one_or_none()
        if legacy is not None:
            return int(legacy)

        v2_balance = db.execute(select(V2User.vault_locked_balance).where(V2User.id == user_id)).scalar_one_or_none()
        if v2_balance is None:
            raise ValueError("user not found")
        return int(v2_balance)

    @staticmethod
    def deposit(db: Session, user_id: int, amount: int) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")

        legacy_user = db.get(User, user_id)
        v2_user = db.get(V2User, user_id)
        if legacy_user is None and v2_user is None:
            raise ValueError("user not found")

        primary_balance = int((legacy_user.vault_locked_balance if legacy_user is not None else v2_user.vault_locked_balance) or 0)
        new_balance = primary_balance + int(amount)

        if legacy_user is not None:
            legacy_user.vault_locked_balance = new_balance
            db.add(legacy_user)
        if v2_user is not None:
            v2_user.vault_locked_balance = new_balance
            db.add(v2_user)

        db.flush()
        return int(new_balance)

    @staticmethod
    def withdraw(db: Session, user_id: int, amount: int) -> int:
        if amount <= 0:
            raise ValueError("amount must be > 0")

        legacy_user = db.get(User, user_id)
        v2_user = db.get(V2User, user_id)
        if legacy_user is None and v2_user is None:
            raise ValueError("user not found")

        primary_balance = int((legacy_user.vault_locked_balance if legacy_user is not None else v2_user.vault_locked_balance) or 0)
        if primary_balance < amount:
            raise ValueError("insufficient locked balance")

        new_balance = primary_balance - int(amount)

        if legacy_user is not None:
            legacy_user.vault_locked_balance = new_balance
            db.add(legacy_user)
        if v2_user is not None:
            v2_user.vault_locked_balance = new_balance
            db.add(v2_user)

        db.flush()
        return int(new_balance)

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
        
        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            now_dt: 기준 시각 (기본: 현재 UTC)
        
        Returns:
            (is_suspended, deposit_7d) tuple
            - is_suspended: 제재 여부
            - deposit_7d: 최근 7일 입금 합계
        """
        now_dt = now_dt or datetime.utcnow()
        
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
        
        return is_suspended, int(deposit_7d)

    def get_status(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, User, bool]:
        """V2 adapted get_status mimicking V1 VaultService behavior.
        
        SoT: V2User.vault_locked_balance (but synced with legacy User).
        """
        now_dt = now or datetime.utcnow()
        v2s2 = Vault2Service()
        eligible = v2s2.get_eligibility(db, program_key=v2s2.DEFAULT_PROGRAM_KEY, user_id=user_id)

        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        user = db.get(User, legacy_user_id)
        if not user:
             # Fallback to creating/fetching User if only V2User exists? 
             # For now, we assume ensure_legacy_user_id handles it or we fail.
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # Sync legacy mirror for UI compatibility
        user.vault_balance = int(user.vault_locked_balance or 0)
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
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)

        locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
        reserved_amount = self.get_withdrawal_reserved_amount(db=db, user_id=legacy_user_id)
        available_amount = max(locked_balance - reserved_amount, 0)

        # CC Deposit (External Ranking) check
        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        op_date_kst = self._operational_date_kst(now_dt)
        now_kst_date = now_dt.astimezone(tz).date()

        delta_today = (
            db.query(ExternalRankingDailyDepositDelta.deposit_delta)
            .filter(
                ExternalRankingDailyDepositDelta.user_id == legacy_user_id,
                ExternalRankingDailyDepositDelta.kst_date == op_date_kst,
            )
            .scalar()
            or 0
        )
        has_cc_deposit_today = int(delta_today) > 0

        if not has_cc_deposit_today:
            rank_data = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == legacy_user_id).first()
            if rank_data and rank_data.deposit_amount > 0 and rank_data.updated_at:
                sync_dt_utc = rank_data.updated_at
                if sync_dt_utc.tzinfo is None:
                    sync_dt_utc = sync_dt_utc.replace(tzinfo=timezone.utc)
                if sync_dt_utc.astimezone(tz).date() == now_kst_date and rank_data.deposit_amount > (rank_data.daily_base_deposit or 0):
                    has_cc_deposit_today = True

        if not has_cc_deposit_today:
            activity = db.query(UserActivity).filter(UserActivity.user_id == legacy_user_id).first()
            if activity and activity.last_charge_at:
                last_charge_utc = activity.last_charge_at
                if last_charge_utc.tzinfo is None:
                    last_charge_utc = last_charge_utc.replace(tzinfo=timezone.utc)
                if last_charge_utc.astimezone(tz).date() == now_kst_date:
                    has_cc_deposit_today = True

        # Activity stats
        three_days_ago_ts = now_dt - timedelta(days=3)
        recent_play_count = db.query(func.count(VaultEarnEvent.id)).filter(
            VaultEarnEvent.user_id == legacy_user_id,
            VaultEarnEvent.earn_type == "GAME_PLAY",
            VaultEarnEvent.created_at >= three_days_ago_ts,
        ).scalar() or 0

        seven_days_ago_date = (now_dt - timedelta(days=6)).date()
        deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
            ExternalRankingDailyDepositDelta.user_id == legacy_user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
        ).scalar() or 0

        from app.v2.models.v2_user_segment import V2UserSegment
        
        current_segment = db.query(V2UserSegment.segment).filter(V2UserSegment.user_id == user_id).scalar()
        segments = [str(current_segment).upper()] if current_segment else []

        play_target = 30
        spend_target = 10000
        if "AT_RISK" in segments:
            play_target = 100
            spend_target = 30000
        elif deposit_7d >= 3000000:
            play_target = 0
            spend_target = 0
        elif deposit_7d >= 500000:
            play_target = 15
            spend_target = 20000

        withdrawal_count = db.query(func.count(VaultWithdrawalRequest.id)).filter(
            VaultWithdrawalRequest.user_id == legacy_user_id,
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
            VaultLedger.user_id == legacy_user_id,
            VaultLedger.amount > 0,
            VaultLedger.created_at >= op_start_utc
        ).scalar() or 0

        # ---------------------------------------------------------------------
        # New Field: Next Tier Goal (Dynamic Withdrawal Goal)
        # ---------------------------------------------------------------------
        approved_count_val = db.query(func.count(VaultWithdrawalRequest.id)).filter(
            VaultWithdrawalRequest.user_id == legacy_user_id,
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
            select(func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance))
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
        query = select(User)
        if sort_by == "vault_balance":
            order_col = func.coalesce(User.vault_available_balance, 0) + func.coalesce(User.vault_locked_balance, 0)
            query = query.order_by(order_col.desc())
        elif sort_by == "total_deposit":
            query = query.order_by(User.total_charge_amount.desc())
        else:
            query = query.order_by(User.updated_at.desc())

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
        from app.models.vault_ledger import VaultLedger
        user = db.get(User, user_id)
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
        from app.models.vault_ledger import VaultLedger
        from app.v2.services.admin_audit_service import V2AdminAuditService

        user = db.get(User, user_id)
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
                select(func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance))
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
            user = db.get(User, w.user_id)
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
        if amount < 10_000:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MIN_WITHDRAWAL_AMOUNT_10000")

        now = datetime.now(timezone.utc)
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

        if not has_cc_deposit_today:
             earn_event_count = (
                db.query(func.count(VaultEarnEvent.id))
                .filter(
                    VaultEarnEvent.user_id == user_id,
                    VaultEarnEvent.earn_type.in_(["GAME_PLAY", "MISSION_REWARD"]),
                    VaultEarnEvent.created_at >= now - timedelta(days=3)
                )
                .scalar()
                or 0
            )
             if int(earn_event_count) < 1:
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CC_DEPOSIT_REQUIRED_TODAY")

        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        # Tiered minimum balance requirement (SoT: 10k -> 10k -> 30k -> 50k)
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

        total = int(getattr(user, "vault_locked_balance", 0) or 0)
        if total < required_min_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIN_WITHDRAWAL_AMOUNT_{required_min_balance}",
            )

        # Concurrency & Balance checks
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
