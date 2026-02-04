"""V2 level XP wrapper (v2 import surface)."""
from __future__ import annotations

from typing import Any


class V2LevelXPService:
    def add_xp(self, db, user_id: int, delta: int, source: str, meta: dict | None = None) -> dict[str, Any]:
        from app.services.level_xp_service import LevelXPService

        return LevelXPService().add_xp(db, user_id=user_id, delta=delta, source=source, meta=meta)
