"""V2 season pass wrapper (v2 import surface)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any


class V2SeasonPassService:
    def add_bonus_xp(
        self,
        db,
        user_id: int,
        xp_amount: int,
        now: date | datetime | None = None,
        commit: bool = True,
    ) -> dict[str, Any]:
        from app.services.season_pass_service import SeasonPassService

        return SeasonPassService().add_bonus_xp(
            db,
            user_id=user_id,
            xp_amount=xp_amount,
            now=now,
            commit=commit,
        )
