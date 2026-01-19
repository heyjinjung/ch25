"""Backward-compatible shim for renamed/moved admin CC deposit routes.

SoT lives in `app.v2.api.admin_cc_deposit`.
"""

from app.v2.api.admin_cc_deposit import router  # noqa: F401

__all__ = ["router"]
