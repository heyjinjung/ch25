"""V2 `game_common` shim that delegates to V1 implementation.

This module exposes `GamePlayContext` and `log_game_play` under
`app.v2.services.game_common` by delegating to the legacy
`app.services.game_common` implementation. This preserves existing
behavior while moving the import surface to v2 for migration work.
"""
from __future__ import annotations

from typing import Any, Dict

from app.services.game_common import GamePlayContext as V1GamePlayContext, log_game_play as _v1_log_game_play

# Re-export the V1 dataclass type so typing is preserved for callers.
GamePlayContext = V1GamePlayContext


def log_game_play(ctx: GamePlayContext, db: Any, payload: Dict[str, Any]) -> None:
    """Delegate to legacy `log_game_play` implementation."""
    return _v1_log_game_play(ctx, db, payload)


__all__ = ["GamePlayContext", "log_game_play"]
