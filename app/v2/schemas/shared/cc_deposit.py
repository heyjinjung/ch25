"""Backward-compatible shim for renamed/moved CC deposit schemas.

SoT lives in `app.v2.schemas.v2_cc_deposit`.
"""

from app.v2.schemas.v2_cc_deposit import (  # noqa: F401
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