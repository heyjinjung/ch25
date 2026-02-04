"""
Compatibility shim for legacy import path.

Some deployments import `app.v2.models.v2_admin_audit_log` while the
canonical model lives in `app.models.admin_audit_log`. This module
re-exports the model to avoid ModuleNotFoundError.
"""

from app.v2.models import AdminAuditLog

__all__ = ["AdminAuditLog"]
