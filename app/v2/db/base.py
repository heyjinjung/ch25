"""Base declarative class for V2 models."""
from app.db.base_class import Base

from app.v2.models import (  # noqa: F401
    V2LevelRewardTable,
)

__all__ = ["Base"]
