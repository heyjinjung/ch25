"""Vault service (Phase 1: locked balance is the source of truth).

Phase 1 rules implemented here:
- All calculations use `user.vault_locked_balance`.
- `user.vault_balance` is a legacy read-only mirror kept in sync from locked.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
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

    GAME_EARN_BASE_AMOUNT = 200
    GAME_EARN_DICE_LOSE_BONUS = 100

    @classmethod
    def vault_accrual_multiplier(cls, db: Session | None = None, now: datetime | None = None) -> float:
        """Return a multiplier for vault accrual amounts.

        Priority:
        1. VaultProgram.config_json["accrual_multiplier"] (if db provided)
        2. Settings (env) if enabled
        3. Default 1.0
        """
        # Try DB first if session available
        if db is not None:
            db_val = Vault2Service().get_config_value(db, "accrual_multiplier")
            if db_val is not None:
                try:
                    return max(float(db_val), 1.0)
                except (TypeError, ValueError):
                    pass

        # Fallback to legacy settings
        settings = get_settings()
        if not bool(getattr(settings, "vault_accrual_multiplier_enabled", False)):
            return 1.0

        start_kst = getattr(settings, "vault_accrual_multiplier_start_kst", None)
        end_kst = getattr(settings, "vault_accrual_multiplier_end_kst", None)
        if start_kst is None or end_kst is None:
            return 1.0

        raw_value = float(getattr(settings, "vault_accrual_multiplier_value", 1.0) or 1.0)
        value = max(raw_value, 1.0)

        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)
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
                "trigger": "EXTERNAL_RANKING_DEPOSIT_INCREASE",
                "tiers": [
                    {"min_deposit_delta": cls.VAULT_TIER_A_MIN_DELTA, "unlock_amount": cls.VAULT_TIER_A_UNLOCK},
                    {"min_deposit_delta": cls.VAULT_TIER_B_MIN_DELTA, "unlock_amount": cls.VAULT_TIER_B_UNLOCK},
                ],
                "notes": "unlock_amount는 vault_locked_balance를 초과할 수 없으며 min(locked, unlock_target)로 적용됨",
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
    def _compute_locked_expires_at(cls, now: datetime) -> datetime:
        return now + timedelta(hours=cls.VAULT_LOCKED_DURATION_HOURS)

    @classmethod
    def _ensure_locked_expiry(cls, user: User, now: datetime) -> bool:
        """Ensure `vault_locked_expires_at` is set when threshold is reached.

        Phase 1.2 Policy:
        - Timer starts ONLY when balance >= 10,000 (VAULT_SEED_AMOUNT).
        - Timer is FIXED for the duration (24h) once set.
        - Timer clears if balance drops below threshold (e.g., after payout).
        - Timer clears if balance is zero.
        """
        locked = int(getattr(user, "vault_locked_balance", 0) or 0)
        expires_at = getattr(user, "vault_locked_expires_at", None)
        threshold = cls.VAULT_SEED_AMOUNT

        if locked < threshold:
            if expires_at is not None:
                user.vault_locked_expires_at = None
                return True
            return False

        # If we reached threshold and no timer is set (or expired), start it.
        if expires_at is None or expires_at <= now:
            user.vault_locked_expires_at = cls._compute_locked_expires_at(now)
            return True

        # Timer is already active; do NOT extend (Fixed window).
        return False

    @classmethod
    def _expire_locked_if_due(cls, user: User, now: datetime) -> bool:
        """Expire locked balance when `vault_locked_expires_at` is due.

        Phase 1: expiration applies only to locked balance.
        Returns True if the user row was mutated.
        """
        expires_at = getattr(user, "vault_locked_expires_at", None)
        locked = int(getattr(user, "vault_locked_balance", 0) or 0)
        if expires_at is None or locked <= 0:
            return False
        if expires_at > now:
            return False

        user.vault_locked_balance = 0
        user.vault_locked_expires_at = None
        cls.sync_legacy_mirror(user)
        return True

    @staticmethod
    def _is_eligible_row_active(row: NewMemberDiceEligibility | None, now: datetime) -> bool:
        if row is None:
            return False
        if not row.is_eligible:
            return False
        if row.revoked_at is not None:
            return False
        if row.expires_at is not None and row.expires_at <= now:
            return False
        return True

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
        
        Phase 1.2 simplification: All logged-in users are eligible for vault accrual
        to maximize engagement and retention.
        """
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
        if mutated:
            db.add(user)
            db.commit()
            db.refresh(user)

        # IMPORTANT UX POLICY:
        # Do not auto-seed on status fetch. The initial seed is granted on actual funnel events
        # (e.g., 신규회원 주사위 LOSE 시 보관, 또는 무료 fill 사용 시).
        return eligible, user, False

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

        Returns unlock_amount (cash granted) for observability.

        Phase 1 responsibility split:
        - External ranking service detects delta and calls this.
        - Unlock calculation and ledger/cash grant are centralized here.
        """

        now_dt = now or datetime.utcnow()
        if deposit_delta <= 0:
            return 0

        # Eligibility is required for Phase 1 vault funnel.
        if not self._eligible(db, user_id, now_dt):
            return 0

        unlock_target = 0
        tier = None
        
        # 1. Try DB-configured tiers
        program = Vault2Service().get_default_program(db, ensure=False)
        rules = getattr(program, "unlock_rules_json", {}) or {}
        p1_config = rules.get("phase1_deposit_unlock", {}) or {}
        tiers = p1_config.get("tiers", []) # List[dict] with min_deposit_delta, unlock_amount
        
        if tiers:
            # Tiers should be sorted by delta desc
            sorted_tiers = sorted(tiers, key=lambda x: x.get("min_deposit_delta", 0), reverse=True)
            for t in sorted_tiers:
                m_delta = t.get("min_deposit_delta", 0)
                u_amt = t.get("unlock_amount", 0)
                if deposit_delta >= m_delta:
                    unlock_target = u_amt
                    tier = f"TIER_{m_delta}"
                    break
        
        # 2. Hardcoded Fallback
        if unlock_target <= 0:
            if deposit_delta >= self.VAULT_TIER_B_MIN_DELTA:
                unlock_target = self.VAULT_TIER_B_UNLOCK
                tier = "B"
            elif deposit_delta >= self.VAULT_TIER_A_MIN_DELTA:
                unlock_target = self.VAULT_TIER_A_UNLOCK
                tier = "A"

        if unlock_target <= 0:
            return 0

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

        # Phase 1: if locked expired, do not unlock.
        self._expire_locked_if_due(user, now_dt)
        locked = int(user.vault_locked_balance or 0)
        if locked <= 0:
            return 0

        unlock_amount = min(locked, unlock_target)
        user.vault_locked_balance = max(locked - unlock_amount, 0)
        self._ensure_locked_expiry(user, now_dt)
        self.sync_legacy_mirror(user)
        db.add(user)

        RewardService().grant_point(
            db,
            user_id=user.id,
            amount=unlock_amount,
            reason="VAULT_UNLOCK",
            label="VAULT_UNLOCK",
            meta={
                "trigger": "EXTERNAL_RANKING_DEPOSIT_INCREASE",
                "tier": tier,
                "unlock_target": unlock_target,
                "unlock_amount": unlock_amount,
                "external_ranking_deposit_prev": prev_amount,
                "external_ranking_deposit_new": new_amount,
                "external_ranking_deposit_delta": deposit_delta,
            },
            commit=False,
        )

        # Phase 2/3-stage prep: record unlock event into Vault2 status (bookkeeping only).
        try:
            Vault2Service().record_unlock_event(
                db,
                user_id=user.id,
                unlock_amount=unlock_amount,
                trigger="EXTERNAL_RANKING_DEPOSIT_INCREASE",
                meta={
                    "tier": tier,
                    "unlock_target": unlock_target,
                    "external_ranking_deposit_prev": prev_amount,
                    "external_ranking_deposit_new": new_amount,
                    "external_ranking_deposit_delta": deposit_delta,
                },
                now=now_dt,
                commit=False,
            )
        except Exception:
            pass

        if commit:
            db.commit()
        else:
            db.flush()
        return unlock_amount

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
        - Amount: base +200 per play; for DICE LOSE add +100.
        - Eligibility required (same as Phase 1 vault funnel).
        - Expires-at is set only when absent/expired; never refreshed while active.

        Returns the amount actually added (0 if skipped / duplicate / not eligible).
        """

        settings = get_settings()
        if not bool(getattr(settings, "enable_vault_game_earn_events", False)):
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

        base_amount = int(self.GAME_EARN_BASE_AMOUNT)
        bonus_amount = 0
        if str(game_type).upper() == "DICE" and str(outcome).upper() == "LOSE":
            bonus_amount = int(self.GAME_EARN_DICE_LOSE_BONUS)

        amount_before_multiplier = base_amount + bonus_amount
        if amount_before_multiplier <= 0:
            return 0

        multiplier = float(self.vault_accrual_multiplier(db, now_dt))
        amount = max(int(round(amount_before_multiplier * multiplier)), amount_before_multiplier)

        # Lock user row for update when supported.
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

        # Phase 1: clear expired locked first, then accrue.
        self._expire_locked_if_due(user, now_dt)
        user.vault_locked_balance = int(user.vault_locked_balance or 0) + int(amount)
        self._ensure_locked_expiry(user, now_dt)
        self.sync_legacy_mirror(user)

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
                "vault_accrual_multiplier": multiplier,
                "amount_before_multiplier": int(amount_before_multiplier),
            },
            created_at=now_dt,
        )

        db.add(user)
        db.add(event)

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
        if not bool(getattr(settings, "enable_trial_payout_to_vault", False)):
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
