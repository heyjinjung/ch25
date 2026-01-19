"""Backward-compatible shim for renamed CC deposit schemas."""
from app.schemas.cc_deposit import (  # noqa: F401
    CCDepositBase,
    CCDepositCreate,
    CCDepositEntry,
    CCDepositListResponse,
    CCDepositUpdate,
    ExternalRankingBase,
    ExternalRankingCreate,
    ExternalRankingEntry,
    ExternalRankingListResponse,
    ExternalRankingUpdate,
)

__all__ = [
    "CCDepositBase",
    "CCDepositCreate",
    "CCDepositEntry",
    "CCDepositListResponse",
    "CCDepositUpdate",
    "ExternalRankingBase",
    "ExternalRankingCreate",
    "ExternalRankingEntry",
    "ExternalRankingListResponse",
    "ExternalRankingUpdate",
]
