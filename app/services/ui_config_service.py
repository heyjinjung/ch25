"""Service for reading/writing admin-editable UI configuration."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.app_ui_config import AppUiConfig
from app.services.audit_service import AuditService


class UiConfigService:
    @staticmethod
    def get(db: Session, key: str) -> AppUiConfig | None:
        return db.execute(select(AppUiConfig).where(AppUiConfig.key == key)).scalar_one_or_none()

    @staticmethod
    def upsert(db: Session, key: str, value: dict | None, admin_id: int = 0) -> AppUiConfig:
        row = UiConfigService.get(db, key)
        before = {"value": row.value_json} if row else None
        
        if row is None:
            row = AppUiConfig(key=key, value_json=value or {})
            db.add(row)
            db.commit()
            db.refresh(row)
        else:
            row.value_json = value or {}
            db.add(row)
            db.commit()
            db.refresh(row)

        after = {"value": row.value_json}
        AuditService.record_admin_audit(db, admin_id=admin_id, action="UPDATE_UI_CONFIG", target_type="AppUiConfig", target_id=key, before=before, after=after)
        db.commit() # Ensure audit log is committed
        
        return row
