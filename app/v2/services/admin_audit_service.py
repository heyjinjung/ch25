from typing import Any, Optional
from sqlalchemy.orm import Session
from app.v2.models import AdminAuditLog

class V2AdminAuditService:
    @staticmethod
    def log(
        db: Session,
        admin_id: int,
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        before: Optional[Any] = None,
        after: Optional[Any] = None,
        auto_commit: bool = True,
    ) -> AdminAuditLog:
        """Create an audit log entry for administrative actions with V2 standards."""
        log_entry = AdminAuditLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before_json=before,
            after_json=after
        )
        db.add(log_entry)
        if auto_commit:
            db.commit()
        else:
            db.flush()
        return log_entry
