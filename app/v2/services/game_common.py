"""V2 game_common no-op utilities.

Provides `GamePlayContext` and `log_game_play` as minimal no-op implementations
so that game engines stop using the V1 `app.services.game_common`.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class GamePlayContext:
    user_id: int
    feature_type: str | int
    today: Any = None


def log_game_play(ctx: GamePlayContext, db: Any, payload: Dict[str, Any]) -> None:
    """No-op logger for game plays in v2 (disabled per archive request)."""
    return None


__all__ = ["GamePlayContext", "log_game_play"]
