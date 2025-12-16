"""Admin endpoints for user segmentation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_segment import AdminUserSegmentResponse, AdminUserSegmentUpsertRequest
from app.services.admin_segment_service import AdminSegmentService

router = APIRouter(prefix="/admin/api/segments", tags=["admin", "segments"])


@router.get("", response_model=list[AdminUserSegmentResponse])
@router.get("/", response_model=list[AdminUserSegmentResponse])
def list_segments(
    external_id: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list[AdminUserSegmentResponse]:
    limit = max(1, min(limit, 500))
    rows = AdminSegmentService.list_segments(db, external_id=external_id, limit=limit)
    return [AdminUserSegmentResponse.model_validate(r) for r in rows]


@router.put("", response_model=AdminUserSegmentResponse)
@router.put("/", response_model=AdminUserSegmentResponse)
def upsert_segment(payload: AdminUserSegmentUpsertRequest, db: Session = Depends(get_db)) -> AdminUserSegmentResponse:
    try:
        row = AdminSegmentService.upsert_segment(
            db,
            user_id=payload.user_id,
            external_id=payload.external_id,
            segment=payload.segment,
        )
        return AdminUserSegmentResponse.model_validate(row)
    except ValueError as exc:
        if str(exc) == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND") from exc
        raise
