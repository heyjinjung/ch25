"""Vault service (Phase 1: locked balance is the source of truth).

Phase 1 rules implemented here:
- All calculations use `user.vault_locked_balance`.
- `user.vault_balance` is a legacy read-only mirror kept in sync from locked.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.feature import UserEventLog
from app.core.notifications import notify_vault_skip_error
from app.services.reward_service import RewardService
from app.services.vault2_service import Vault2Service


class VaultService:
    VAULT_SEED_AMOUNT = 10_000
    VAULT_FILL_AMOUNT = 5_000
    VAULT_LOCKED_DURATION_HOURS = 24

    # Vault unlock tiers (Phase 1): determined by deposit increase delta.
    # Option A (10,000 charge): unlock 5,000 and keep remainder locked.
    # Option B (50,000 charge): unlock 10,000.
    VAULT_TIER_A_MIN_DELTA = 10_000
    VAULT_TIER_A_UNLOCK = 5_000
    VAULT_TIER_B_MIN_DELTA = 50_000
    VAULT_TIER_B_UNLOCK = 10_000

    PROGRAM_KEY = "NEW_MEMBER_VAULT"

    GAME_EARN_DICE_WIN = 200
    GAME_EARN_DICE_LOSE = -50


    @staticmethod
    def _to_utc(now: datetime) -> datetime:
        if now.tzinfo is None:
            return now.replace(tzinfo=timezone.utc)
        return now.astimezone(timezone.utc)

    @classmethod
    def _operational_date_kst(cls, now: datetime) -> datetime.date:
        settings = get_settings()
        reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
        reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))

        now_utc = cls._to_utc(now)
        now_kst = now_utc.astimezone(tz)
        if now_kst.hour < reset_hour:
            return now_kst.date() - timedelta(days=1)
        return now_kst.date()

    @staticmethod
    def _streak_vault_schedule(streak_days: int) -> tuple[float, int | None]:
        """Return (multiplier, duration_hours).

        duration_hours is None for "all day" (no time limit) or when no bonus.
        """
        if streak_days == 2:
            return 1.2, 1
        if streak_days == 3:
            return 1.2, 4
        if streak_days == 6:
            return 1.5, 1
        if streak_days >= 7:
            return 2.0, None
        return 1.0, None

    def _streak_vault_bonus_multiplier(
        self,
        *,
        user: User,
        now: datetime,
        eligible: bool,
    ) -> float:
        settings = get_settings()
        if not bool(getattr(settings, "streak_vault_bonus_enabled", False)):
            return 1.0
        if not eligible:
            return 1.0

        streak_days = int(getattr(user, "play_streak", 0) or 0)
        multiplier, duration_hours = self._streak_vault_schedule(streak_days)
        if multiplier <= 1.0:
            return 1.0

        if duration_hours is None:
            return float(multiplier)

        now_utc = self._to_utc(now)
        op_date = self._operational_date_kst(now_utc)

        start_date = getattr(user, "streak_vault_bonus_date", None)
        start_at = getattr(user, "streak_vault_bonus_started_at", None)
        if start_date != op_date or start_at is None:
            user.streak_vault_bonus_date = op_date
            # Store naive UTC timestamp for compatibility with legacy datetime columns.
            user.streak_vault_bonus_started_at = now_utc.replace(tzinfo=None)
            return float(multiplier)

        start_utc = start_at.replace(tzinfo=timezone.utc)
        if now_utc <= start_utc + timedelta(hours=int(duration_hours)):
            return float(multiplier)

        return 1.0


    @classmethod
    def vault_accrual_multiplier(cls, db: Session | None = None, now: datetime | None = None) -> float:
        """Return a multiplier for vault accrual amounts.

        Priority:
        1. Golden Hour (Peak Time) boost (if enabled and within window)
        2. VaultProgram.config_json["accrual_multiplier"] (if db provided)
        3. Settings (env) if enabled
        4. Default 1.0
        """
        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        # 1. Golden Hour Check
        if db is not None:
            v2 = Vault2Service()
            gh_cfg = v2.get_config_value(db, "golden_hour_config", {})
            if gh_cfg and gh_cfg.get("enabled"):
                override = gh_cfg.get("manual_override", "AUTO")
                if override == "FORCE_ON":
                    return float(gh_cfg.get("multiplier", 2.0))
                if override == "FORCE_OFF":
                    pass # Continue to other multipliers
                else:
                    # AUTO: Check KST window
                    settings = get_settings()
                    tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
                    now_kst = now_dt.astimezone(tz)
                    current_time_str = now_kst.strftime("%H:%M:%S")
                    
                    start = gh_cfg.get("start_time_kst", "21:30:00")
                    end = gh_cfg.get("end_time_kst", "22:30:00")
                    if start <= current_time_str <= end:
                        return float(gh_cfg.get("multiplier", 2.0))

        # 2. Try DB first if session available
        if db is not None:
            db_val = Vault2Service().get_config_value(db, "accrual_multiplier")
            if db_val is not None:
                try:
                    return max(float(db_val), 1.0)
                except (TypeError, ValueError):
                    pass

        # 3. Fallback to legacy settings
        settings = get_settings()
        if not bool(getattr(settings, "vault_accrual_multiplier_enabled", False)):
            return 1.0

        start_kst = getattr(settings, "vault_accrual_multiplier_start_kst", None)
        end_kst = getattr(settings, "vault_accrual_multiplier_end_kst", None)
        if start_kst is None or end_kst is None:
            return 1.0

        raw_value = float(getattr(settings, "vault_accrual_multiplier_value", 1.0) or 1.0)
        value = max(raw_value, 1.0)

        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        today_kst = now_dt.astimezone(tz).date()

        if start_kst <= today_kst <= end_kst:
            return value
        return 1.0

    @classmethod
    def phase1_unlock_rules_json(cls, now: datetime | None = None) -> dict:
        """Return unlock rules JSON for UI.

        Keep Phase 1 deposit-unlock tiers for backward compatibility, while also exposing
        the grand-cycle rule payload used by the newer vault UX.
        """

        settings = get_settings()
        # Note: phase1_unlock_rules_json doesn't have db here but it's called from vault.py status which has db
        # If we want accuracy we should pass db here too.
        # For now I will keep it as is or update signature if needed.
        mult = cls.vault_accrual_multiplier(now=now)
        return {
            "version": 2,
            "program_key": cls.PROGRAM_KEY,
            "accrual_multiplier": {
                "active": mult,
                "default": 1.0,
                "enabled": bool(getattr(settings, "vault_accrual_multiplier_enabled", False)),
                "window_kst": {
                    "start": str(getattr(settings, "vault_accrual_multiplier_start_kst", None) or ""),
                    "end": str(getattr(settings, "vault_accrual_multiplier_end_kst", None) or ""),
                },
            },
            "phase1_deposit_unlock": {
                "trigger": "GAME_PLAY_ACCRUAL",
                "tiers": [],
                "notes": "게임 플레이 시 포인트가 금고에 적립되며, 이용 내역 확인 시 보유 머니로 전환됩니다.",
            },
            "grand_cycle_unlock": {
                "gold_unlock_tiers": [30, 50, 70],
                "diamond_unlock": {
                    "min_diamond_keys": 2,
                    "min_gold_cumulative": 1_000_000,
                },
                "seed_carryover": {
                    "min_percent": 10,
                    "max_percent": 30,
                    "default_percent": 20,
                },
            },
        }

    @staticmethod
    def sync_legacy_mirror(user: User) -> None:
        # `vault_balance` is a legacy mirror for UI compatibility.
        user.vault_balance = int(user.vault_locked_balance or 0)

    @classmethod
    def _compute_locked_expires_at(cls, now: datetime) -> datetime | None:
        return now + timedelta(hours=cls.VAULT_LOCKED_DURATION_HOURS)

    @classmethod
    def _ensure_locked_expiry(cls, user: User, now: datetime) -> bool:
        """[DEPRECATED] Ensure `vault_locked_expires_at` is set when threshold is reached.
        
        Phase 3 Override: 
        Vault expiration Logic is PERMANENTLY DISABLED. 
        Points accumulate as an asset and do not expire.
        """
        # DISABLED
        return False

    @classmethod
    def _expire_locked_if_due(cls, user: User, now: datetime) -> bool:
        """[DEPRECATED] Expire locked balance when `vault_locked_expires_at` is due.
        
        Phase 3 Override:
        Vault expiration Logic is PERMANENTLY DISABLED.
        """
        # DISABLED
        return False

    # Admin-only helpers for timer control
    @classmethod
    def admin_timer_action(cls, db: Session, *, user_id: int, action: str, now: datetime | None = None) -> User:
        now_dt = now or datetime.utcnow()
        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        action_l = action.lower()
        if action_l == "reset":
            user.vault_locked_expires_at = None
        elif action_l == "expire_now":
            user.vault_locked_balance = 0
            user.vault_locked_expires_at = None
        elif action_l == "start_now":
            user.vault_locked_expires_at = cls._compute_locked_expires_at(now_dt)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ACTION")

        cls.sync_legacy_mirror(user)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user



    def _get_or_create_user(self, db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        return user

    def _eligible(self, db: Session, user_id: int, now: datetime) -> bool:
        """Eligibility guard for Phase 1.

        Default: 모두 허용. 단, VaultProgram config_json에 allow/block 정책이 있으면 그것을 우선 적용한다.
        """
        cfg_service = Vault2Service()
        program = cfg_service.get_default_program(db, ensure=True)
        cfg = {} if program is None else (program.config_json or {})
        mode = (cfg.get("eligibility_mode") or "all").lower()
        allow = set(cfg.get("eligibility_allow") or [])
        block = set(cfg.get("eligibility_block") or [])

        if mode == "allowlist":
            return user_id in allow
        if mode == "blocklist":
            return user_id not in block
        if user_id in block:
            return False
        return True

    def get_status(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, User, bool]:
        now_dt = now or datetime.utcnow()
        eligible = self._eligible(db, user_id, now_dt)
        user = self._get_or_create_user(db, user_id)

        # Expire due locked balance (Phase 1) without auto-seeding.
        mutated = self._expire_locked_if_due(user, now_dt)
        # Keep legacy mirror consistent even if other code wrote vault_balance directly.
        # (This is a cheap assignment and helps avoid stale UI.)
        self.sync_legacy_mirror(user)

        # VIP Unlock Check (Lazy)
        # NOTE: In single-SoT rollout, do NOT migrate locked → cash_balance on status fetch.
        # VIP behavior should be expressed as eligibility/withdraw rules, not as a balance transfer.
        if mutated:
            db.add(user)
            db.commit()
            db.refresh(user)

        # IMPORTANT UX POLICY:
        # Do not auto-seed on status fetch. The initial seed is granted on actual funnel events
        # (e.g., 신규회원 주사위 LOSE 시 보관, 또는 무료 fill 사용 시).
        return eligible, user, False

    def get_withdrawal_reserved_amount(self, db: Session, user_id: int) -> int:
        from app.models.vault_withdrawal_request import VaultWithdrawalRequest

        q = (
            db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0))
            .filter(VaultWithdrawalRequest.user_id == user_id, VaultWithdrawalRequest.status == "PENDING")
        )
        val = q.scalar() or 0
        return int(val)

    def get_vault_amounts(self, db: Session, user_id: int) -> tuple[int, int, int]:
        user = self._get_or_create_user(db, user_id)
        total = int(getattr(user, "vault_locked_balance", 0) or 0)
        reserved = self.get_withdrawal_reserved_amount(db=db, user_id=user_id)
        available = max(total - reserved, 0)
        return total, reserved, available

    def fill_free_once(self, db: Session, user_id: int, now: datetime | None = None) -> tuple[bool, User, int, datetime]:
        now_dt = now or datetime.utcnow()
        eligible = self._eligible(db, user_id, now_dt)
        if not eligible:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VAULT_NOT_ELIGIBLE")

        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        if user.vault_fill_used_at is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="VAULT_FILL_ALREADY_USED")

        # Phase 1: clear expired locked first.
        self._expire_locked_if_due(user, now_dt)

        # Ensure the initial seed exists for a first-time eligible user.
        seed_added = 0
        if (user.vault_locked_balance or 0) == 0 and (user.cash_balance or 0) == 0:
            user.vault_locked_balance = self.VAULT_SEED_AMOUNT
            seed_added = self.VAULT_SEED_AMOUNT

        multiplier = self.vault_accrual_multiplier(db, now_dt)
        fill_added = max(int(round(self.VAULT_FILL_AMOUNT * multiplier)), self.VAULT_FILL_AMOUNT)
        user.vault_locked_balance = (user.vault_locked_balance or 0) + fill_added
        total_added = seed_added + fill_added
        self._ensure_locked_expiry(user, now_dt)
        self.sync_legacy_mirror(user)
        user.vault_fill_used_at = now_dt
        db.add(user)

        # Phase 2/3-stage prep: record accrual into Vault2 bookkeeping (no v1 behavior change).
        try:
            Vault2Service().accrue_locked(db, user_id=user.id, amount=total_added, now=now_dt, commit=False)
        except Exception:
            # Keep v1 flow resilient; Vault2 is scaffolding.
            pass

        db.commit()
        db.refresh(user)

        return eligible, user, fill_added, now_dt

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
        """Process external ranking "deposit increased" signal.

        Returns unlock_amount (legacy: cash granted) for observability.

        Phase 1 responsibility split:
        - External ranking service detects delta and calls this.
        - Unlock calculation and ledger/cash grant are centralized here.
        """

        now_dt = now or datetime.utcnow()
        if deposit_delta <= 0:
            return 0

        # Eligibility is required for Phase 1 vault funnel.
        # Eligibility is required for Phase 1 vault funnel.
        if not self._eligible(db, user_id, now_dt):
            return 0

        # 1. Fetch User (needed for Total Charge update)
        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)

        if user is None:
            return 0

        # 2. Sync Total Charge (Always)
        user.total_charge_amount = int(new_amount)

        # Phase 3 (Single-SoT rollout): stop writing cash_balance from "unlock" flows.
        # The legacy behavior migrated locked -> cash via RewardService.grant_point().
        # For now, deposit signals only update total_charge_amount; unlock semantics will be
        # redefined via eligibility/withdraw rules rather than balance transfers.

        db.add(user)
        if commit:
            db.commit()
        else:
            db.flush()
        return 0

    def record_game_play_earn_event(
        self,
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
        """Idempotently accrue Phase 1 vault locked balance for a game play.

        - Idempotency key is derived from (game_type, game_log_id).
                - Amount: determined by VaultProgram.config_json["game_earn_config"] (DB) first.
                    Fallbacks:
                    - DICE: WIN=+200, LOSE=-50 (DRAW=0)
                    - ROULETTE: reward_amount==0 => -50 else +200
        - Eligibility required (same as Phase 1 vault funnel).
        - Expires-at is set only when absent/expired; never refreshed while active.

        Returns the amount actually added (0 if skipped / duplicate / not eligible).
        """

        settings = get_settings()

        # DB 우선: VaultProgram config_json.enable_game_earn_events; 없으면 env 사용
        cfg_service = Vault2Service()
        db_flag = cfg_service.get_config_value(db, "enable_game_earn_events", None)
        enable_game_earn = bool(db_flag) if db_flag is not None else bool(getattr(settings, "enable_vault_game_earn_events", False))
        if not enable_game_earn:
            return 0

        now_dt = now or datetime.utcnow()

        # Eligibility guard (Phase 1 funnel).
        if not self._eligible(db, user_id, now_dt):
            return 0

        earn_event_id = f"GAME:{str(game_type).upper()}:{int(game_log_id)}"

        # Fast path: already recorded.
        exists = db.execute(
            select(VaultEarnEvent.id).where(VaultEarnEvent.earn_event_id == earn_event_id)
        ).first()
        if exists is not None:
            return 0

        game_type_upper = str(game_type).upper()
        outcome_upper = str(outcome).upper() if outcome else "BASE"

        # Lock user row for update when supported (needed for LOSE bonus decision + accrual).
        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)
        if user is None:
            return 0

        # 1. Try to get specific amount from DB config
        game_earn_config = cfg_service.get_config_value(db, "game_earn_config", {})
        game_config = game_earn_config.get(game_type_upper, {})
        amount_before_multiplier = game_config.get(outcome_upper)

        # 2. Hardcoded Fallbacks
        if amount_before_multiplier is None:
            if game_type_upper == "DICE":
                # Prefer payout-reported reward_amount (wired from DiceConfig via DiceService)
                # so admin-configured win/draw/lose amounts drive Vault accruals.
                payout = payout_raw or {}
                if payout.get("reward_amount") is not None:
                    amount_before_multiplier = int(payout.get("reward_amount") or 0)
                else:
                    if outcome_upper == "WIN":
                        amount_before_multiplier = 200
                    elif outcome_upper == "LOSE":
                        amount_before_multiplier = -50
                    else:
                        amount_before_multiplier = 0
            elif game_type_upper == "ROULETTE":
                # Check payout details to detect "LOSE" (꽝)
                payout = payout_raw or {}
                r_amount = int(payout.get("reward_amount", 0))
                # Treat 0 reward as LOSE -> -50
                if r_amount == 0:
                    amount_before_multiplier = -50
                else:
                    amount_before_multiplier = 200
            else:
                # Default for other games (LOTTERY, etc.)
                amount_before_multiplier = 200

        if int(amount_before_multiplier or 0) == 0:
            return 0

        amount_before_multiplier = int(amount_before_multiplier)

        base_multiplier = float(self.vault_accrual_multiplier(db, now_dt))

        # Streak vault bonus: applies ONLY to the base +200 accrual amount and only for base game modes.
        eligible_for_streak_bonus = False
        if game_type_upper == "DICE":
            mode = str((payout_raw or {}).get("mode") or "NORMAL").upper()
            eligible_for_streak_bonus = (
                token_type == GameTokenType.DICE_TOKEN.value
                and mode == "NORMAL"
            )
        elif game_type_upper == "ROULETTE":
            eligible_for_streak_bonus = token_type == GameTokenType.ROULETTE_COIN.value
        elif game_type_upper == "LOTTERY":
            eligible_for_streak_bonus = token_type == GameTokenType.LOTTERY_TICKET.value

        streak_multiplier = 1.0
        if amount_before_multiplier == 200 and amount_before_multiplier > 0:
            streak_multiplier = float(
                self._streak_vault_bonus_multiplier(user=user, now=now_dt, eligible=eligible_for_streak_bonus)
            )

        total_multiplier = float(base_multiplier) * float(streak_multiplier)

        # Golden Hour specific: Apply a 200 KRW (Win) / -50 KRW (Loss) gate for the Golden Hour multiplier boost.
        # This ensures the 2.0x boost ONLY applies to base game results as per Slot Plan.
        v2_service = Vault2Service()
        gh_cfg = v2_service.get_config_value(db, "golden_hour_config", {})
        is_gh_active_now = False

        if gh_cfg and gh_cfg.get("enabled"):
            override = gh_cfg.get("manual_override", "AUTO")
            if override == "FORCE_ON":
                is_gh_active_now = True
            elif override == "AUTO":
                settings = get_settings()
                tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
                now_kst = now_dt.astimezone(tz)
                current_time_str = now_kst.strftime("%H:%M:%S")
                start = gh_cfg.get("start_time_kst", "21:30:00")
                end = gh_cfg.get("end_time_kst", "22:30:00")
                if start <= current_time_str <= end:
                    is_gh_active_now = True

        # If Golden Hour is active, we only apply its component (base_multiplier > 1.0)
        # if the amount matches the expected gates.
        if is_gh_active_now and total_multiplier > 1.0:
            allowed_amounts = [200, -50]
            if amount_before_multiplier not in allowed_amounts:
                # Revert to a non-GH multiplier
                total_multiplier = 1.0

        # Calculate amount with multiplier.
        if amount_before_multiplier > 0:
            # Positive accrual: ensure at least base amount
            amount = max(int(round(amount_before_multiplier * total_multiplier)), amount_before_multiplier)
        else:
            # Negative accrual (Loss): ensure it becomes more negative (doubled penalty)
            # e.g., -50 * 2.0 = -100. min(-100, -50) = -100.
            amount = min(int(round(amount_before_multiplier * total_multiplier)), amount_before_multiplier)

        # --- Caps Check (Phase 1 for Event) ---
        # If event mode (or generally configured), check caps.
        # We check "daily_gain" cap if defined in VaultProgram.

        caps = cfg_service.get_config_value(db, "caps", {}).get(game_type_upper)
        if caps and isinstance(caps, dict):
            daily_gain_cap = caps.get("daily_gain")
            if daily_gain_cap is not None:
                daily_gain_cap = int(daily_gain_cap)
                # Calculate today's net gain so far
                today_start = datetime(now_dt.year, now_dt.month, now_dt.day)

                # Sum amounts from VaultEarnEvent for today
                current_daily_gain = db.execute(
                    select(func.coalesce(func.sum(VaultEarnEvent.amount), 0)).where(
                        VaultEarnEvent.user_id == user_id,
                        VaultEarnEvent.created_at >= today_start,
                        VaultEarnEvent.game_type == game_type_upper
                    )
                ).scalar() or 0

                # Check if adding 'amount' exceeds cap
                # Note: amount can be negative (LOSE). Caps usually limit positive gain?
                # The requirement says "1일 최대 순증 +20,000".
                # If amount is positive, we clamp it. If negative, we let it pass (it reduces gain).

                if amount > 0:
                    potential_total = current_daily_gain + amount
                    if potential_total > daily_gain_cap:
                        # Clamp amount
                        allowed = max(0, daily_gain_cap - current_daily_gain)
                        if allowed < amount:
                            # Log clamping if significant?
                            pass
                        amount = allowed

        # [REFACTORED] Vault Expiry Logic Disabled (Phase 3 Unified Economy)
        # All points are accrued immediately and serve as a persistent asset.
        
        # Phase 1: clear expired locked first.
        # self._expire_locked_if_due(user, now_dt)  <-- DISABLED
        
        user.vault_locked_balance = int(user.vault_locked_balance or 0) + int(amount)
        
        # self._ensure_locked_expiry(user, now_dt)  <-- DISABLED
        self.sync_legacy_mirror(user)

        bonus_amount = 0 # Phase 1: No bonus logic here yet
        reward_kind = "BASE" if bonus_amount == 0 else "BASE_PLUS_BONUS"
        event = VaultEarnEvent(
            user_id=user.id,
            earn_event_id=earn_event_id,
            earn_type="GAME_PLAY",
            amount=int(amount),
            source=str(game_type).upper(),
            reward_kind=reward_kind,
            game_type=str(game_type).upper(),
            token_type=token_type,
            payout_raw_json={
                **(payout_raw or {}),
                "vault_accrual_multiplier": base_multiplier,
                "streak_vault_bonus_multiplier": streak_multiplier,
                "vault_total_multiplier": total_multiplier,
                "amount_before_multiplier": int(amount_before_multiplier),
            },
            created_at=now_dt,
        )
        
        # [NEW] Ledger Entry for Vault Accrual
        # To maintain a trusted transaction history for all vault changes.
        from app.models.user_cash_ledger import UserCashLedger  # pylint: disable=import-outside-toplevel
        ledger_entry = UserCashLedger(
            user_id=user.id,
            delta=int(amount),
            balance_after=user.vault_locked_balance,
            reason="VAULT_ACCRUAL",
            label=f"GAME:{str(game_type).upper()}",
            meta_json={
                "asset_type": "VAULT",
                "earn_event_id": earn_event_id,
                "game_log_id": game_log_id,
                "game_type": str(game_type).upper()
            },
            created_at=now_dt
        )

        db.add(user)
        db.add(event)
        db.add(ledger_entry)

        # Observability: streak vault bonus application
        if eligible_for_streak_bonus and amount_before_multiplier == 200 and float(streak_multiplier) > 1.0:
            try:
                meta = {
                    "game_type": game_type_upper,
                    "token_type": token_type,
                    "streak_days": int(getattr(user, "play_streak", 0) or 0),
                    "streak_multiplier": float(streak_multiplier),
                    "base_multiplier": float(base_multiplier),
                    "total_multiplier": float(total_multiplier),
                    "amount_before_multiplier": int(amount_before_multiplier),
                    "amount": int(amount),
                }
                if game_type_upper == "DICE":
                    meta["mode"] = str((payout_raw or {}).get("mode") or "NORMAL").upper()
                db.add(
                    UserEventLog(
                        user_id=int(user.id),
                        feature_type="STREAK",
                        event_name="streak.vault_bonus_applied",
                        meta_json=meta,
                    )
                )
            except Exception:
                # Do not block vault accrual for observability logging.
                pass

        # Phase 2/3-stage prep: record accrual into Vault2 bookkeeping (no v1 behavior change).
        try:
            Vault2Service().accrue_locked(db, user_id=user.id, amount=int(amount), now=now_dt, commit=False)
        except Exception:
            pass

        try:
            db.commit()
        except IntegrityError:
            # Duplicate earn_event_id raced in; rollback and skip.
            db.rollback()
            return 0

        return int(amount)

    def record_trial_result_earn_event(
        self,
        db: Session,
        *,
        user_id: int,
        game_type: str,
        game_log_id: int,
        token_type: str | None,
        reward_type: str | None,
        reward_amount: int | None,
        payout_raw: dict | None = None,
        now: datetime | None = None,
        force_enable: bool = False,
    ) -> int:
        """Idempotently route a TRIAL play reward into Vault (Phase 1 locked).

        Guarded by ENABLE_TRIAL_PAYOUT_TO_VAULT.
        - Uses a separate earn_event_id namespace: TRIAL:{GAME}:{LOG_ID}:{REWARD_ID}
        - Valuation:
          - POINT: amount = reward_amount
          - otherwise: settings.trial_reward_valuation["{REWARD_TYPE}:{REWARD_AMOUNT}"]
        - If valuation is missing/non-monetary, records a 0-amount event as SKIP (no vault mutation).

        Returns the amount actually added to locked balance (0 if skipped/duplicate/not eligible).
        """

        settings = get_settings()
        if not force_enable and not bool(getattr(settings, "enable_trial_payout_to_vault", False)):
            return 0

        now_dt = now or datetime.utcnow()

        # Eligibility guard (Phase 1 funnel).
        if not self._eligible(db, user_id, now_dt):
            return 0

        rt = str(reward_type or "").upper()
        ra = int(reward_amount or 0)
        reward_id = f"{rt}:{ra}"
        earn_event_id = f"TRIAL:{str(game_type).upper()}:{int(game_log_id)}:{reward_id}"

        exists = db.execute(select(VaultEarnEvent.id).where(VaultEarnEvent.earn_event_id == earn_event_id)).first()
        if exists is not None:
            return 0

        amount = 0
        amount_before_multiplier = 0
        reward_kind: str | None = None
        if rt == "POINT" and ra > 0:
            amount = ra
            amount_before_multiplier = ra
            reward_kind = "POINT"
        elif not rt or rt in {"NONE", "NO_REWARD"} or ra <= 0:
            # Expected "no payout" outcomes (e.g., roulette blanks) should be silent.
            # Still record a 0-amount TRIAL_PAYOUT event for idempotency/audit.
            amount = 0
            amount_before_multiplier = 0
            reward_kind = "SKIP_NO_REWARD"
        else:
            # Try DB config first
            valuation = Vault2Service().get_config_value(db, "trial_reward_valuation", {})
            amount = valuation.get(reward_id)

            # Fallback to legacy settings
            if amount is None:
                settings_valuation = getattr(settings, "trial_reward_valuation", {}) or {}
                amount = settings_valuation.get(reward_id, 0)

            try:
                amount = int(amount or 0)
            except Exception:
                amount = 0

            amount_before_multiplier = int(amount)
            if amount > 0:
                reward_kind = "VALUED"
            else:
                reward_kind = "SKIP_NO_VALUATION"
                notify_vault_skip_error(source=str(game_type), reward_id=reward_id, reason="MISSING_VALUATION")

        multiplier = float(self.vault_accrual_multiplier(db, now_dt))
        if amount > 0:
            amount = max(int(round(int(amount) * multiplier)), int(amount))

        # Only mutate vault when amount > 0; still record a 0-amount SKIP event.
        user = None
        if amount > 0:
            q = db.query(User).filter(User.id == user_id)
            if db.bind and db.bind.dialect.name != "sqlite":
                q = q.with_for_update()
            user = q.one_or_none()
            if user is None and db.bind and db.bind.dialect.name == "sqlite":
                user = User(id=user_id, external_id=f"test-user-{user_id}")
                db.add(user)
                db.commit()
                db.refresh(user)
            if user is None:
                return 0

            self._expire_locked_if_due(user, now_dt)
            user.vault_locked_balance = int(user.vault_locked_balance or 0) + int(amount)
            self._ensure_locked_expiry(user, now_dt)
            self.sync_legacy_mirror(user)
            db.add(user)

        event = VaultEarnEvent(
            user_id=int(user_id),
            earn_event_id=earn_event_id,
            earn_type="TRIAL_PAYOUT",
            amount=int(amount),
            source=str(game_type).upper(),
            reward_kind=reward_kind,
            game_type=str(game_type).upper(),
            token_type=token_type,
            payout_raw_json={
                **(payout_raw or {}),
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_id": reward_id,
                "vault_accrual_multiplier": multiplier,
                "amount_before_multiplier": int(amount_before_multiplier),
            },
            created_at=now_dt,
        )
        db.add(event)

        if amount > 0:
            try:
                Vault2Service().accrue_locked(db, user_id=int(user_id), amount=int(amount), now=now_dt, commit=False)
            except Exception:
                pass

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return 0

        return int(amount) if amount > 0 else 0

    def accrue_mission_reward(
        self,
        db: Session,
        *,
        user_id: int,
        mission_id: int,
        mission_title: str,
        amount: int,
        now: datetime | None = None,
    ) -> int:
        """
        Accrue mission reward into Vault (Phase 1 locked).
        Replaces legacy 'Unlock' behavior for CASH_UNLOCK rewards.
        """
        if amount <= 0:
            return 0

        now_dt = now or datetime.utcnow()

    # Eligibility guard REMOVED for Mission Rewards.
    # Missions are explicit rewards that should always be granted if completed.
    # (Phase 1 funnel restriction removed for this flow)
    # if not self._eligible(db, user_id, now_dt):
    #    return 0

        earn_event_id = f"MISSION:{user_id}:{mission_id}"

        # Idempotency check
        exists = db.execute(
            select(VaultEarnEvent.id).where(VaultEarnEvent.earn_event_id == earn_event_id)
        ).first()
        if exists:
            return 0

        # Lock User
        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()

        if not user:
             # Implicitly created if strictly needed, but Missions imply user exists.
             return 0

        # Accrue
        print(f"[VaultService] Previous Balance: {user.vault_locked_balance}, Adding: {amount}")
        self._expire_locked_if_due(user, now_dt)
        print(f"[VaultService] Post-Expire Balance: {user.vault_locked_balance}")
        
        user.vault_locked_balance = int(user.vault_locked_balance or 0) + int(amount)
        print(f"[VaultService] New Balance: {user.vault_locked_balance}")
        
        self._ensure_locked_expiry(user, now_dt)
        self.sync_legacy_mirror(user)

        # Record Event
        event = VaultEarnEvent(
            user_id=user.id,
            earn_event_id=earn_event_id,
            earn_type="MISSION_REWARD",
            amount=int(amount),
            source="MISSION",
            reward_kind="FIXED_CASH",
            payout_raw_json={
                "mission_id": mission_id,
                "mission_title": mission_title,
            },
            created_at=now_dt,
        )

        db.add(user)
        db.add(event)

        # Vault2 Sync
        try:
            Vault2Service().accrue_locked(db, user_id=user.id, amount=int(amount), now=now_dt, commit=False)
        except Exception:
            pass

        try:
            db.commit()
            db.refresh(user)
            print(f"[VaultService] Post-Commit Balance: {user.vault_locked_balance}")
        except IntegrityError:
            db.rollback()
            return 0

        return int(amount)

    def request_withdrawal(self, db: Session, user_id: int, amount: int) -> dict:
        """Request a withdrawal.

        Single-SoT rules:
        - total: user.vault_locked_balance
        - reserved: sum(PENDING withdrawal requests)
        - available: total - reserved

        Conditions:
        1. Amount >= 10,000.
        2. User must have a deposit record TODAY (UserActivity.last_charge_at).
        3. Sufficient available amount.
        """
        from app.models.vault_withdrawal_request import VaultWithdrawalRequest
        from app.models.user_activity import UserActivity

        # 1. Validation
        if amount < 10_000:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MIN_WITHDRAWAL_AMOUNT_10000")

        now = datetime.utcnow()
        today = now.date()

        # 2. Check Eligibility (Same Day Deposit)
        activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
        if not activity or not activity.last_charge_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NO_DEPOSIT_RECORD_TODAY")

        last_charge_date = activity.last_charge_at.date()
        if last_charge_date != today:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DEPOSIT_REQUIRED_TODAY")

        # 3. Check Available & Create Request (no balance deduction at request time)
        q = db.query(User).filter(User.id == user_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        reserved_before = self.get_withdrawal_reserved_amount(db=db, user_id=user_id)
        total = int(getattr(user, "vault_locked_balance", 0) or 0)
        available_before = max(total - reserved_before, 0)
        if available_before < amount:
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

        reserved_after = reserved_before + amount
        available_after = max(total - reserved_after, 0)

        return {
            "request_id": req.id,
            "status": req.status,
            "amount": req.amount,
            "created_at": req.created_at,
            "balance_after": available_after,
        }

    def process_withdrawal(self, db: Session, request_id: int, action: str, admin_id: int, memo: str | None = None) -> dict:
        """Process a withdrawal request (APPROVE or REJECT)."""
        from app.models.vault_withdrawal_request import VaultWithdrawalRequest
        from app.services.audit_service import AuditService

        action = action.upper()
        if action not in ("APPROVE", "REJECT"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ACTION")

        req = db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.id == request_id).with_for_update().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="REQUEST_NOT_FOUND")

        if req.status != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REQUEST_ALREADY_PROCESSED")

        before_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": int(req.amount or 0),
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }

        now = datetime.utcnow()
        req.processed_at = now
        req.processed_by = admin_id
        req.admin_memo = memo

        user_before = None
        user_after = None

        if action == "APPROVE":
            req.status = "APPROVED"
            # Deduct from single SoT at approval time.
            q = db.query(User).filter(User.id == req.user_id)
            if db.bind and db.bind.dialect.name != "sqlite":
                q = q.with_for_update()
            user = q.one_or_none()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

            total = int(getattr(user, "vault_locked_balance", 0) or 0)
            if total < int(req.amount):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INSUFFICIENT_FUNDS")

            user_before = {
                "user_id": user.id,
                "vault_locked_balance": total,
            }

            user.vault_locked_balance = total - int(req.amount)
            self.sync_legacy_mirror(user)
            db.add(user)

            user_after = {
                "user_id": user.id,
                "vault_locked_balance": int(getattr(user, "vault_locked_balance", 0) or 0),
            }

        elif action == "REJECT":
            req.status = "REJECTED"
            # No refund needed (nothing deducted at request time).

        after_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": int(req.amount or 0),
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action=f"VAULT_WITHDRAWAL_{action}",
            target_type="User",
            target_id=str(req.user_id),
            before={
                "request": before_req,
                "user": user_before,
            },
            after={
                "request": after_req,
                "user": user_after,
            },
        )

        db.commit()
        db.refresh(req)

        return {
            "request_id": req.id,
            "status": req.status,
            "processed_at": req.processed_at
        }

    def admin_adjust_withdrawal_amount(
        self,
        db: Session,
        *,
        request_id: int,
        new_amount: int,
        admin_id: int,
        memo: str | None = None,
    ) -> dict:
        """Admin: adjust amount of a PENDING withdrawal request.

        Why:
        - Users may request a withdrawal amount then ask ops to reduce it.
        - Without this, ops often manually adjusts balances, which can desync expiry/reserved logic.

        Rules:
        - Only PENDING requests can be adjusted.
        - new_amount must respect minimum withdrawal amount.
        - If increasing, ensure sufficient available amount considering other pending requests.
        """
        from app.models.vault_withdrawal_request import VaultWithdrawalRequest
        from app.services.audit_service import AuditService

        try:
            new_amount_i = int(new_amount)
        except (TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_AMOUNT")

        if new_amount_i < 10_000:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MIN_WITHDRAWAL_AMOUNT_10000")

        req = (
            db.query(VaultWithdrawalRequest)
            .filter(VaultWithdrawalRequest.id == request_id)
            .with_for_update()
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="REQUEST_NOT_FOUND")
        if req.status != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REQUEST_ALREADY_PROCESSED")

        old_amount = int(req.amount or 0)
        before_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": old_amount,
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }
        if new_amount_i == old_amount:
            # Still allow updating memo for audit clarity.
            if memo is not None:
                req.admin_memo = memo
                req.processed_by = admin_id
                db.add(req)

                AuditService.record_admin_audit(
                    db,
                    admin_id=admin_id,
                    action="VAULT_WITHDRAWAL_ADJUST_AMOUNT",
                    target_type="User",
                    target_id=str(req.user_id),
                    before={"request": before_req},
                    after={
                        "request": {
                            **before_req,
                            "admin_memo": req.admin_memo,
                            "processed_by": req.processed_by,
                        }
                    },
                )

                db.commit()
                db.refresh(req)
            return {"request_id": req.id, "status": req.status, "amount": int(req.amount)}

        # On increase: validate against available funds excluding this request.
        if new_amount_i > old_amount:
            q = db.query(User).filter(User.id == req.user_id)
            if db.bind and db.bind.dialect.name != "sqlite":
                q = q.with_for_update()
            user = q.one_or_none()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

            reserved_other = int(
                db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0))
                .filter(
                    VaultWithdrawalRequest.user_id == req.user_id,
                    VaultWithdrawalRequest.status == "PENDING",
                    VaultWithdrawalRequest.id != req.id,
                )
                .scalar()
                or 0
            )
            total = int(getattr(user, "vault_locked_balance", 0) or 0)
            available_for_this = max(total - reserved_other, 0)
            if available_for_this < new_amount_i:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INSUFFICIENT_FUNDS")

        req.amount = new_amount_i
        req.processed_by = admin_id
        if memo is not None:
            req.admin_memo = memo
        db.add(req)

        after_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": int(req.amount or 0),
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action="VAULT_WITHDRAWAL_ADJUST_AMOUNT",
            target_type="User",
            target_id=str(req.user_id),
            before={"request": before_req},
            after={"request": after_req},
        )

        db.commit()
        db.refresh(req)
        return {"request_id": req.id, "status": req.status, "amount": int(req.amount)}

    def admin_cancel_withdrawal_request(
        self,
        db: Session,
        *,
        request_id: int,
        admin_id: int,
        memo: str | None = None,
    ) -> dict:
        """Admin: cancel a PENDING withdrawal request.

        This is operationally useful when the user's locked balance expired (total becomes 0)
        and the pending request blocks available balance via reservation.

        Rules:
        - Only PENDING requests can be cancelled.
        - Cancelling clears reservation because reserved is sum(PENDING) only.
        """
        from app.models.vault_withdrawal_request import VaultWithdrawalRequest
        from app.services.audit_service import AuditService

        req = (
            db.query(VaultWithdrawalRequest)
            .filter(VaultWithdrawalRequest.id == request_id)
            .with_for_update()
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="REQUEST_NOT_FOUND")
        if req.status != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REQUEST_ALREADY_PROCESSED")

        before_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": int(req.amount or 0),
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }

        now = datetime.utcnow()
        req.status = "CANCELLED"
        req.processed_at = now
        req.processed_by = admin_id
        if memo is not None:
            req.admin_memo = memo

        db.add(req)

        after_req = {
            "id": req.id,
            "user_id": req.user_id,
            "amount": int(req.amount or 0),
            "status": req.status,
            "processed_at": req.processed_at,
            "processed_by": req.processed_by,
            "admin_memo": req.admin_memo,
        }

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action="VAULT_WITHDRAWAL_CANCEL",
            target_type="User",
            target_id=str(req.user_id),
            before={"request": before_req},
            after={"request": after_req},
        )

        db.commit()
        db.refresh(req)
        return {"request_id": req.id, "status": req.status, "processed_at": req.processed_at}
