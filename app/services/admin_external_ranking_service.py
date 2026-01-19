"""Backward-compatible shim for renamed CC deposit service."""
from app.services.admin_cc_deposit_service import AdminExternalRankingService  # noqa: F401

__all__ = ["AdminExternalRankingService"]
