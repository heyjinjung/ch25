from datetime import datetime
from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog

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
            before_json=before,
            after_json=after,
        )
        db.add(log)
        db.flush()
        return log
