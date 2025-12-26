"""Vault 2.0 scaffold service.

Phase 2/3-stage rollout prep:
- Adds optional state transition helpers (locked→available→expired).
- Adds program policy JSON parsing helpers.
- Adds event recording entrypoints (accrual/unlock) without changing existing v1 gameplay.

NOTE: To keep incremental rollout safe, nothing calls these mutating helpers by default.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.vault2 import VaultProgram, VaultStatus
from app.models.admin_audit_log import AdminAuditLog
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_cash_ledger import UserCashLedger
from app.models.user import User
from sqlalchemy import func, select
from app.services.audit_service import AuditService


# Default config knobs for Vault program operations
DEFAULT_CONFIG = {
    # 전역 적립 온/오프 (env보다 우선 적용)
    "enable_game_earn_events": True,
    # 적립 대상 정책: all | allowlist | blocklist
    "eligibility_mode": "all",
    # allowlist/blocklist는 간단히 user_id 정수 배열로 관리 (소규모 운영용)
    "eligibility_allow": [],
    "eligibility_block": [],
    # 이벤트 보너스 규칙 (예: 충전 기반 보너스) 확장용
    "charge_bonus_rules": [],
}


class Vault2Service:
    DEFAULT_PROGRAM_KEY = "NEW_MEMBER_VAULT"
    DEFAULT_PROGRAM_NAME = "신규 정착 금고"

    def compute_expires_at(self, locked_at: datetime, duration_hours: int) -> datetime:
        return locked_at + timedelta(hours=duration_hours)

    def _ensure_default_program(self, db: Session) -> VaultProgram:
        program = db.query(VaultProgram).filter(VaultProgram.key == self.DEFAULT_PROGRAM_KEY).one_or_none()
        if program is not None:
            return program

        program = VaultProgram(
            key=self.DEFAULT_PROGRAM_KEY,
            name=self.DEFAULT_PROGRAM_NAME,
            duration_hours=24,
            expire_policy="FIXED_24H",
            unlock_rules_json={
                # Optional: if set (>0), AVAILABLE can expire after this grace window.
                # Keep default as 0 to avoid behavior surprises.
                "available_grace_hours": 0,
            },
            ui_copy_json=None,
            is_active=True,
            config_json=DEFAULT_CONFIG.copy(),
        )
        db.add(program)
        db.flush()
        return program

    def get_default_program(self, db: Session, *, ensure: bool = True) -> VaultProgram | None:
        if ensure:
            return self._ensure_default_program(db)
        return db.query(VaultProgram).filter(VaultProgram.key == self.DEFAULT_PROGRAM_KEY).one_or_none()

    def get_config_value(self, db: Session, key: str, default: Any = None) -> Any:
        """Helper to get value from the default program's config_json."""
        program = self.get_default_program(db, ensure=False)
        if program and isinstance(program.config_json, dict):
            return program.config_json.get(key, default)
        return default

    def update_config_value(self, db: Session, *, program_key: str, key: str, value: Any, admin_id: int = 0) -> VaultProgram:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")

        cfg = DEFAULT_CONFIG.copy()
        if isinstance(program.config_json, dict):
            cfg.update(program.config_json)
        before = {"config_json": program.config_json}
        cfg[key] = value
        program.config_json = cfg
        after = {"config_json": program.config_json}

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action="UPDATE_CONFIG_FIELD",
            target_type="VaultProgram",
            target_id=program_key,
            before=before,
            after=after,
        )

        db.add(program)
        db.commit()
        db.refresh(program)
        return program

    def toggle_game_earn(self, db: Session, *, program_key: str, enabled: bool, admin_id: int = 0) -> VaultProgram:
        return self.update_config_value(db, program_key=program_key, key="enable_game_earn_events", value=bool(enabled), admin_id=admin_id)

    def upsert_eligibility(self, db: Session, *, program_key: str, user_id: int, eligible: bool, admin_id: int = 0) -> VaultProgram:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")

        cfg = DEFAULT_CONFIG.copy()
        if isinstance(program.config_json, dict):
            cfg.update(program.config_json)

        allow = set(cfg.get("eligibility_allow") or [])
        block = set(cfg.get("eligibility_block") or [])

        if eligible:
            block.discard(user_id)
            allow.add(user_id)
        else:
            allow.discard(user_id)
            block.add(user_id)

        cfg["eligibility_allow"] = sorted(allow)
        cfg["eligibility_block"] = sorted(block)
        cfg["eligibility_mode"] = cfg.get("eligibility_mode") or "all"

        before = {"config_json": program.config_json}
        program.config_json = cfg
        after = {"config_json": program.config_json}

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action="UPSERT_ELIGIBILITY",
            target_type="VaultProgram",
            target_id=f"{program_key}:{user_id}",
            before=before,
            after=after,
        )

        db.add(program)
        db.commit()
        db.refresh(program)
        return program

    def get_eligibility(self, db: Session, *, program_key: str, user_id: int) -> bool:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")

        cfg = DEFAULT_CONFIG.copy()
        if isinstance(program.config_json, dict):
            cfg.update(program.config_json)
        mode = (cfg.get("eligibility_mode") or "all").lower()
        allow = set(cfg.get("eligibility_allow") or [])
        block = set(cfg.get("eligibility_block") or [])

        if mode == "allowlist":
            return user_id in allow
        if mode == "blocklist":
            return user_id not in block
        # default: all
        if user_id in block:
            return False
        return True

    def get_program_by_key(self, db: Session, *, program_key: str) -> VaultProgram | None:
        return db.query(VaultProgram).filter(VaultProgram.key == program_key).one_or_none()

    def update_program_unlock_rules(self, db: Session, *, program_key: str, unlock_rules_json: dict | None, admin_id: int = 0) -> VaultProgram:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")
        
        before = {"unlock_rules_json": program.unlock_rules_json}
        program.unlock_rules_json = unlock_rules_json
        after = {"unlock_rules_json": unlock_rules_json}
        
        AuditService.record_admin_audit(db, admin_id=admin_id, action="UPDATE_UNLOCK_RULES", target_type="VaultProgram", target_id=program_key, before=before, after=after)
        
        db.add(program)
        db.commit()
        db.refresh(program)
        return program

    def update_program_ui_copy(self, db: Session, *, program_key: str, ui_copy_json: dict | None, admin_id: int = 0) -> VaultProgram:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")
        
        before = {"ui_copy_json": program.ui_copy_json}
        program.ui_copy_json = ui_copy_json
        after = {"ui_copy_json": ui_copy_json}
        
        AuditService.record_admin_audit(db, admin_id=admin_id, action="UPDATE_UI_COPY", target_type="VaultProgram", target_id=program_key, before=before, after=after)
        
        db.add(program)
        db.commit()
        db.refresh(program)
        return program

    def update_program_config(self, db: Session, *, program_key: str, config_json: dict | None, admin_id: int = 0) -> VaultProgram:
        program = self.get_program_by_key(db, program_key=program_key)
        if program is None:
            if program_key == self.DEFAULT_PROGRAM_KEY:
                program = self._ensure_default_program(db)
            else:
                raise ValueError("PROGRAM_NOT_FOUND")
        
        before = {"config_json": program.config_json}
        program.config_json = config_json
        after = {"config_json": config_json}
        
        AuditService.record_admin_audit(db, admin_id=admin_id, action="UPDATE_CONFIG", target_type="VaultProgram", target_id=program_key, before=before, after=after)
        
        db.add(program)
        db.commit()
        db.refresh(program)
        return program

    @staticmethod
    def _get_available_grace_hours(program: VaultProgram) -> int:
        rules = getattr(program, "unlock_rules_json", None)
        if not isinstance(rules, dict):
            return 0
        try:
            return max(int(rules.get("available_grace_hours") or 0), 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _append_event(status: VaultStatus, event: dict[str, Any]) -> None:
        payload = status.progress_json or {}
        if not isinstance(payload, dict):
            payload = {}
        events = payload.get("events")
        if not isinstance(events, list):
            events = []
        events.append(event)
        payload["events"] = events
        status.progress_json = payload

    def get_or_create_status(self, db: Session, *, user_id: int, program: VaultProgram) -> VaultStatus:
        row = (
            db.query(VaultStatus)
            .filter(VaultStatus.user_id == user_id, VaultStatus.program_id == program.id)
            .one_or_none()
        )
        if row is not None:
            return row

        row = VaultStatus(
            user_id=user_id,
            program_id=program.id,
            state="LOCKED",
            locked_amount=0,
            available_amount=0,
            locked_at=None,
            expires_at=None,
            progress_json=None,
        )
        db.add(row)
        db.flush()
        return row

    def accrue_locked(self, db: Session, *, user_id: int, amount: int, now: datetime | None = None, commit: bool = True) -> VaultStatus:
        """Accrue locked amount into Vault2 status (Phase 2 prep).

        This is additive bookkeeping for rollout; it does not change v1 balances.
        """
        now_dt = now or datetime.utcnow()
        if amount <= 0:
            raise ValueError("INVALID_ACCRUAL_AMOUNT")

        program = self._ensure_default_program(db)
        status = self.get_or_create_status(db, user_id=user_id, program=program)

        status.locked_amount = int(status.locked_amount or 0) + int(amount)
        status.state = "LOCKED"
        if status.locked_at is None:
            status.locked_at = now_dt
        status.expires_at = self.compute_expires_at(status.locked_at, int(program.duration_hours or 24))
        self._append_event(
            status,
            {
                "type": "ACCRUE_LOCKED",
                "amount": int(amount),
                "at": now_dt.isoformat(),
            },
        )

        db.add(status)
        if commit:
            db.commit()
            db.refresh(status)
        else:
            db.flush()
        return status

    def record_unlock_event(
        self,
        db: Session,
        *,
        user_id: int,
        unlock_amount: int,
        trigger: str,
        meta: dict[str, Any] | None = None,
        now: datetime | None = None,
        commit: bool = True,
    ) -> VaultStatus:
        """Record an unlock event in Vault2 status progress JSON (Phase 2 prep).

        In current v1 behavior, unlock is paid into cash immediately.
        This method only records the event for future migration/observability.
        """
        now_dt = now or datetime.utcnow()
        program = self._ensure_default_program(db)
        status = self.get_or_create_status(db, user_id=user_id, program=program)
        self._append_event(
            status,
            {
                "type": "UNLOCK",
                "amount": int(unlock_amount),
                "trigger": trigger,
                "meta": meta or {},
                "at": now_dt.isoformat(),
            },
        )
        db.add(status)
        if commit:
            db.commit()
            db.refresh(status)
        else:
            db.flush()
        return status

    def apply_transitions(self, db: Session, *, now: datetime | None = None, limit: int = 500, commit: bool = True) -> int:
        """Apply state transitions for Vault2 statuses.

        locked -> available: when expires_at <= now.
        available -> expired: when `available_grace_hours` is set and the grace window passes.

        Returns number of rows updated.
        """
        now_dt = now or datetime.utcnow()
        updated = 0

        # 1) LOCKED -> AVAILABLE
        locked_rows = (
            db.query(VaultStatus, VaultProgram)
            .join(VaultProgram, VaultProgram.id == VaultStatus.program_id)
            .filter(VaultStatus.state == "LOCKED", VaultStatus.expires_at.isnot(None), VaultStatus.expires_at <= now_dt)
            .limit(limit)
            .all()
        )
        for status, program in locked_rows:
            locked_amt = int(status.locked_amount or 0)
            if locked_amt > 0:
                status.available_amount = int(getattr(status, "available_amount", 0) or 0) + locked_amt
            status.locked_amount = 0
            status.state = "AVAILABLE"
            self._append_event(status, {"type": "TRANSITION", "from": "LOCKED", "to": "AVAILABLE", "at": now_dt.isoformat()})
            # Track available_since for optional expiry.
            payload = status.progress_json or {}
            if isinstance(payload, dict) and "available_since" not in payload:
                payload["available_since"] = now_dt.isoformat()
                status.progress_json = payload
            db.add(status)
            updated += 1

        # 2) AVAILABLE -> EXPIRED (optional)
        available_rows = (
            db.query(VaultStatus, VaultProgram)
            .join(VaultProgram, VaultProgram.id == VaultStatus.program_id)
            .filter(VaultStatus.state == "AVAILABLE")
            .limit(limit)
            .all()
        )
        for status, program in available_rows:
            grace_hours = self._get_available_grace_hours(program)
            if grace_hours <= 0:
                continue

            payload = status.progress_json or {}
            available_since_raw = payload.get("available_since") if isinstance(payload, dict) else None
            if not available_since_raw:
                continue

            try:
                available_since = datetime.fromisoformat(str(available_since_raw))
            except ValueError:
                continue

            if available_since + timedelta(hours=grace_hours) <= now_dt:
                expired_amt = int(getattr(status, "available_amount", 0) or 0)
                status.available_amount = 0
                status.state = "EXPIRED"
                self._append_event(
                    status,
                    {"type": "TRANSITION", "from": "AVAILABLE", "to": "EXPIRED", "expired_amount": expired_amt, "at": now_dt.isoformat()},
                )
                db.add(status)
                updated += 1

        if updated > 0:
            if commit:
                db.commit()
            else:
                db.flush()

        return updated

    def list_programs(self, db: Session) -> list[VaultProgram]:
        return db.query(VaultProgram).order_by(VaultProgram.id.asc()).all()

    def top_statuses(self, db: Session, limit: int = 10) -> list[tuple[VaultStatus, VaultProgram]]:
        rows = (
            db.query(VaultStatus, VaultProgram)
            .join(VaultProgram, VaultProgram.id == VaultStatus.program_id)
            .order_by(VaultStatus.locked_amount.desc(), VaultStatus.id.asc())
            .limit(limit)
            .all()
        )
        return list(rows)

    def get_vault_stats(self, db: Session, now: datetime | None = None) -> dict[str, Any]:
        """Aggregate performance metrics for Vault Phase 1."""
        now_dt = now or datetime.utcnow()
        today_start = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Today's Accrual
        accrual_stats = (
            db.query(VaultEarnEvent.earn_type, func.count(VaultEarnEvent.id), func.sum(VaultEarnEvent.amount))
            .filter(VaultEarnEvent.created_at >= today_start)
            .group_by(VaultEarnEvent.earn_type)
            .all()
        )
        accrual_summary = {row[0]: {"count": row[1], "total": int(row[2] or 0)} for row in accrual_stats}
        
        # 2. Trial SKIP Reasons
        skip_stats = (
            db.query(VaultEarnEvent.source, func.count(VaultEarnEvent.id))
            .filter(VaultEarnEvent.created_at >= today_start, VaultEarnEvent.reward_kind == "SKIP_NO_VALUATION")
            .group_by(VaultEarnEvent.source)
            .all()
        )
        skip_summary = {row[0]: row[1] for row in skip_stats}
        
        # 3. Expirations in next 24h (Critical for retention ops)
        expiring_soon_count = (
            db.query(func.count(User.id))
            .filter(User.vault_locked_balance > 0, User.vault_locked_expires_at.between(now_dt, now_dt + timedelta(hours=24)))
            .scalar()
        )
        
        # 4. Total Unlocked Cash (Today)
        unlocked_cash_today = (
            db.query(func.sum(UserCashLedger.delta))
            .filter(UserCashLedger.reason == "VAULT_UNLOCK", UserCashLedger.created_at >= today_start)
            .scalar()
        ) or 0

        return {
            "today_accrual": accrual_summary,
            "today_skips": skip_summary,
            "expiring_soon_24h": expiring_soon_count,
            "today_unlock_cash": int(unlocked_cash_today),
            "timestamp": now_dt.isoformat()
        }

