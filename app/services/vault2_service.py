"""Vault 2.0 scaffold service.

No behavior changes: this service is currently only used by read-only endpoints.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.vault2 import VaultProgram, VaultStatus


class Vault2Service:
    def compute_expires_at(self, locked_at: datetime, duration_hours: int) -> datetime:
        return locked_at + timedelta(hours=duration_hours)

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
