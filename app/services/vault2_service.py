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
        )
        db.add(program)
        db.flush()
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
