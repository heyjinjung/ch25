"""Backward-compatible shim for moved public events routes.

SoT lives in `app.v2.api.events`.
"""

from app.v2.api.events import router  # noqa: F401

__all__ = ["router"]
