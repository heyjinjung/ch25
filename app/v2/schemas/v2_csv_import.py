"""V2 CSV import schemas for external casino log integration."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class CSVGameResult(str, Enum):
    """Game result values."""

    WIN = "WIN"
    LOSE = "LOSE"
    DRAW = "DRAW"
    JACKPOT = "JACKPOT"


class CSVGameType(str, Enum):
    """Supported game types from external casinos."""

    DICE = "DICE"
    SLOT = "SLOT"
    ROULETTE = "ROULETTE"
    BLACKJACK = "BLACKJACK"
    POKER = "POKER"
    OTHER = "OTHER"


class ExternalCasinoGameLogCSV(BaseModel):
    """
    Schema for external casino game log CSV rows.

    Expected CSV format:
    timestamp,user_id,external_user_id,game_type,result,bet_amount,payout_amount,balance_after,session_id,game_metadata

    Example:
    2026-01-20T10:30:00Z,12345,ext_abc123,DICE,LOSE,100,0,4500,sess_001,"{\"dice_value\": 3}"
    """

    # Required fields
    timestamp: datetime = Field(
        ...,
        description="ISO 8601 timestamp of game event (UTC)",
    )
    user_id: int = Field(
        ...,
        description="Internal user ID (must exist in database)",
        gt=0,
    )
    game_type: CSVGameType = Field(
        ...,
        description="Type of casino game",
    )
    result: CSVGameResult = Field(
        ...,
        description="Game outcome",
    )
    bet_amount: float = Field(
        ...,
        description="Amount wagered",
        ge=0,
    )
    payout_amount: float = Field(
        ...,
        description="Amount paid out (0 for losses)",
        ge=0,
    )
    balance_after: float = Field(
        ...,
        description="User balance after game",
        ge=0,
    )

    # Optional fields
    external_user_id: Optional[str] = Field(
        None,
        description="External platform user identifier",
        max_length=100,
    )
    session_id: Optional[str] = Field(
        None,
        description="Game session identifier",
        max_length=100,
    )
    game_metadata: Optional[str] = Field(
        None,
        description="JSON string with game-specific data",
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: datetime) -> datetime:
        """Ensure timestamp is not in the future."""
        from datetime import timezone

        # Make both datetime objects timezone-aware for comparison
        now_utc = datetime.now(timezone.utc)
        v_aware = v if v.tzinfo else v.replace(tzinfo=timezone.utc)

        if v_aware > now_utc:
            msg = "Timestamp cannot be in the future"
            raise ValueError(msg)
        return v

    def model_post_init(self, __context) -> None:
        """Validate payout logic after all fields are set."""
        # For LOSE results, payout should be 0
        if self.result == CSVGameResult.LOSE and self.payout_amount > 0:
            msg = "Payout must be 0 for LOSE result"
            raise ValueError(msg)

        # For WIN results, payout should exceed bet
        if self.result == CSVGameResult.WIN and self.payout_amount <= self.bet_amount:
            msg = "Payout must exceed bet amount for WIN result"
            raise ValueError(msg)


class CSVImportJob(BaseModel):
    """CSV import job status."""

    job_id: str
    filename: str
    total_rows: int
    processed_rows: int
    failed_rows: int
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_summary: Optional[str] = None


class CSVImportRequest(BaseModel):
    """Request to import CSV file."""

    file_path: str = Field(
        ...,
        description="Absolute path to CSV file",
    )
    batch_size: int = Field(
        100,
        description="Number of rows to process per batch",
        ge=1,
        le=1000,
    )
    emit_to_redis: bool = Field(
        True,
        description="Whether to emit events to Redis (set False for dry-run)",
    )
    save_to_db: bool = Field(
        True,
        description="Whether to save records to V2GameLog table for analytics",
    )
    historical_mode: bool = Field(
        False,
        description="If True, process as historical data (skip real-time intervention triggers)",
    )
    skip_duplicate_check: bool = Field(
        False,
        description="Skip duplicate session_id checks (faster but may cause duplicates)",
    )
    import_type: str = Field(
        "GAME_LOG",
        description="Type of CSV import: GAME_LOG (default) or HQ_MARGIN",
    )


class CSVImportResult(BaseModel):
    """Result of CSV import operation."""

    job_id: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    skipped_rows: int
    duration_seconds: float
    # Analytics
    total_bet: float = 0.0
    total_payout: float = 0.0
    win_count: int = 0
    loss_count: int = 0
    jackpot_count: int = 0
    unique_user_count: int = 0
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
