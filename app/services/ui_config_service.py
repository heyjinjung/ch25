"""Service for reading/writing admin-editable UI configuration."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.app_ui_config import AppUiConfig


class UiConfigService:
    @staticmethod
    def get(db: Session, key: str) -> AppUiConfig | None:
        return db.execute(select(AppUiConfig).where(AppUiConfig.key == key)).scalar_one_or_none()

    @staticmethod
    def upsert(db: Session, key: str, value: dict | None) -> AppUiConfig:
        row = UiConfigService.get(db, key)
        if row is None:
            row = AppUiConfig(key=key, value_json=value or {})
            db.add(row)
            db.commit()
            db.refresh(row)
            return row

        row.value_json = value or {}
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
