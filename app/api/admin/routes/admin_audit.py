"""Admin endpoints for audit log.

This exposes read-only access to `AdminAuditLog` so ops can inspect who changed what.

Design:
- We reuse existing `admin_audit_log` table (already used for config changes).
- For per-user history, we standardize to `target_type="User"` and `target_id=str(user_id)`.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.models.admin_audit_log import AdminAuditLog

router = APIRouter(prefix="/admin/api/audit", tags=["admin-audit"])


def _clamp_limit(limit: int) -> int:
    try:
        limit_i = int(limit)
    except (TypeError, ValueError):
        return 50
    return min(max(limit_i, 1), 200)


@router.get("/logs")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    admin_id: int | None = None,
    action: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    limit = _clamp_limit(limit)
    offset = max(int(offset or 0), 0)

    q = db.query(AdminAuditLog)
    if admin_id is not None:
        q = q.filter(AdminAuditLog.admin_id == int(admin_id))
    if action:
        q = q.filter(AdminAuditLog.action == action)
    if target_type:
        q = q.filter(AdminAuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AdminAuditLog.target_id == target_id)

    rows = q.order_by(desc(AdminAuditLog.id)).offset(offset).limit(limit).all()

    return [
        {
            "id": r.id,
            "admin_id": r.admin_id,
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "before": r.before_json,
            "after": r.after_json,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.get("/users/{user_id}")
def list_user_audit_logs(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    limit = _clamp_limit(limit)
    offset = max(int(offset or 0), 0)

    rows = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "User", AdminAuditLog.target_id == str(user_id))
        .order_by(desc(AdminAuditLog.id))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": r.id,
            "admin_id": r.admin_id,
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "before": r.before_json,
            "after": r.after_json,
            "created_at": r.created_at,
        }
        for r in rows
    ]
