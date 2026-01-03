from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog


def _to_jsonable(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        # Avoid float precision surprises by defaulting to string.
        return str(value)
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_jsonable(v) for v in value]
    return value


class AuditService:
    @staticmethod
    def record_admin_audit(
        db: Session,
        *,
        admin_id: int,
        action: str,
        target_type: str,
        target_id: str,
        before: dict | None = None,
        after: dict | None = None,
    ) -> AdminAuditLog:
        log = AdminAuditLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before_json=_to_jsonable(before),
            after_json=_to_jsonable(after),
        )
        db.add(log)
        db.flush()
        return log
