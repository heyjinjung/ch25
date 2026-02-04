"""V2 feed configuration schema."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FeedJackpotConfig(BaseModel):
    threshold: int = Field(..., description="Minimum amount to trigger jackpot feed", ge=1000)
    mega_threshold: int = Field(..., description="Minimum amount to trigger MEGA jackpot", ge=5000)


class FeedConfigResponse(FeedJackpotConfig):
    pass
