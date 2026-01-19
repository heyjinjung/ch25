"""Backward-compatible shim for renamed admin CC deposit routes."""
from app.api.admin.routes.admin_cc_deposit import router  # noqa: F401

__all__ = ["router"]
