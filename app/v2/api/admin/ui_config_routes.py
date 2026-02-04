"""V2 Admin UI Config routes - SoT 기반 설정 관리 API.

V2 어드민 전용 UI 설정 관리 엔드포인트.
streak_reward_rules 등 V2 전용 설정 저장/조회에 사용.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.v2.api.deps import get_db, get_current_admin_id
from app.v2.services.ui_config_service import UiConfigService
from pydantic import BaseModel
from datetime import datetime
from typing import Any, Optional


class AdminUiConfigResponse(BaseModel):
    """UI Config 응답 스키마."""
    key: str
    value: Any | None
    updated_at: datetime | None


class AdminUiConfigUpsertRequest(BaseModel):
    """UI Config 갱신 요청 스키마."""
    value: Any


router = APIRouter(prefix="/ui-config", tags=["v2-admin-ui-config"])


@router.get("/{key}", response_model=AdminUiConfigResponse)
def get_admin_ui_config(
    key: str,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> AdminUiConfigResponse:
    """어드민 UI 설정 조회.
    
    Args:
        key: 설정 키 (예: streak_reward_rules)
        db: DB 세션
        admin_id: 어드민 인증용
        
    Returns:
        AdminUiConfigResponse: 설정 값 또는 None
    """
    row = UiConfigService.get(db, key)
    if row is None:
        return AdminUiConfigResponse(key=key, value=None, updated_at=None)
    return AdminUiConfigResponse(
        key=row.key,
        value=row.value_json,
        updated_at=row.updated_at,
    )


@router.put("/{key}", response_model=AdminUiConfigResponse)
def upsert_admin_ui_config(
    key: str,
    payload: AdminUiConfigUpsertRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> AdminUiConfigResponse:
    """어드민 UI 설정 갱신.
    
    Args:
        key: 설정 키 (예: streak_reward_rules)
        payload: 설정 값
        db: DB 세션
        admin_id: 어드민 ID (감사 로그용)
        
    Returns:
        AdminUiConfigResponse: 갱신된 설정
    """
    row = UiConfigService.upsert(db, key, payload.value, admin_id=admin_id)
    return AdminUiConfigResponse(
        key=row.key,
        value=row.value_json,
        updated_at=row.updated_at,
    )
