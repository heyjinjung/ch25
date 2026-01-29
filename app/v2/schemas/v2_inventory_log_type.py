from enum import Enum

class InventoryLogType(str, Enum):
    # ... existing types ...
    DAILY_NUDGE = "DAILY_NUDGE"
    LATENCY_PROVISIONAL = "LATENCY_PROVISIONAL"
    LATENCY_CLAWBACK = "LATENCY_CLAWBACK"
    ROLLBACK_INTERVENTION = "ROLLBACK_INTERVENTION"
