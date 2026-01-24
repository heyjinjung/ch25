"""V2 UiConfig service (v2-only import surface)."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.app_ui_config import AppUiConfig
from app.v2.services.audit_service import AuditService


class UiConfigService:
    @staticmethod
    def get(db: Session, key: str) -> Optional[Any]:
        return db.execute(select(AppUiConfig).where(AppUiConfig.key == key)).scalar_one_or_none()

    @staticmethod
    def upsert(db: Session, key: str, value: dict, admin_id: int | None = None) -> Any:
        from sqlalchemy.orm.attributes import flag_modified

        row = UiConfigService.get(db, key)
        before = {"value": row.value_json} if row else None

        if row is None:
            row = AppUiConfig(key=key, value_json=value or {})
            db.add(row)
            db.commit()
            db.refresh(row)
        else:
            row.value_json = value or {}
            flag_modified(row, "value_json")
            db.add(row)
            db.commit()
            db.refresh(row)

        after = {"value": row.value_json}
        AuditService.record_admin_audit(
            db,
            admin_id=int(admin_id or 0),
            action="UPDATE_UI_CONFIG",
            target_type="AppUiConfig",
            target_id=key,
            before=before,
            after=after,
        )
        db.commit()

        return row
