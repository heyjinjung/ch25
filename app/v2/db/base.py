"""Base declarative class for V2 models."""
from app.db.base_class import Base

from app.v2.models import (  # noqa: F401
    V2LevelRewardTable,
    V2TicketConversionPolicy,
    V2ShopOrder,
    V2ExchangeLog,
    V2TicketZeroLog,
    V2OpsExecutionResult,
)

__all__ = ["Base"]
