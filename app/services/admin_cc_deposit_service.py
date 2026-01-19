"""Backward-compatible shim for moved CC deposit admin service.

SoT lives in `app.v2.services.admin_cc_deposit_service`.
"""

from app.v2.services.admin_cc_deposit_service import AdminExternalRankingService  # noqa: F401

__all__ = ["AdminExternalRankingService"]