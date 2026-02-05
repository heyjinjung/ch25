"""V2 Centralized Constants and Type Definitions.

SoT for all Literal types used across V2 schemas.
Import from here to ensure consistency.

Usage:
    from app.v2.schemas.v2_constants import RewardType, TicketType, GameTokenType
"""
from __future__ import annotations

from typing import Literal

# =============================================================================
# RewardType - 보상 타입 (SoT)
# =============================================================================
# VAULT = vault_locked_balance에 적립 (SoT: User.vault_locked_balance)
# POINT/CC_POINT = VAULT와 동일하게 처리 (레거시 호환)
# =============================================================================
RewardType = Literal[
    # === Core Vault Types ===
    "VAULT",       # SoT: vault_locked_balance에 적립
    "POINT",       # Legacy alias for VAULT
    "CC_POINT",    # Legacy alias for VAULT

    # === Game XP / Diamond ===
    "GAME_XP",     # 게임 경험치
    "DIAMOND",     # 다이아몬드 화폐

    # === Tickets ===
    "TICKET",      # Generic ticket (deprecated, use specific types)
    "BUNDLE",      # 번들 (deprecated)
    "TICKET_BUNDLE",  # 티켓 번들 (deprecated)
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "TRIAL_TICKET",

    # === Fragments ===
    "GOLD_KEY_FRAGMENT",
    "DIAMOND_FRAGMENT",

    # === Puzzle Pieces ===
    "PUZZLE_C",
    "PUZZLE_C1",
    "PUZZLE_C2",
    "PUZZLE_J",
    "PUZZLE_M",

    # === Gifticons ===
    "CHICKEN_GIFTICON_5000",
    "CHICKEN_GIFTICON_10000",
    "STARBUCKS_GIFTICON_2000",
    "STARBUCKS_GIFTICON_5000",
    "STARBUCKS_GIFTICON_10000",
    "CULTURE_VOUCHER_5000",
    "CULTURE_VOUCHER_10000",

    # === Special ===
    "NONE",        # 보상 없음
    "CREDIT",      # Legacy (do not use)
]

# =============================================================================
# CostType - 결제 재화 타입 (SoT)
# =============================================================================
# 모든 보상타입 = 결제재화 = 획득재화 원칙 (기프티콘 제외)
# =============================================================================
CostType = Literal[
    # === 금고 (Vault) ===
    "VAULT",       # SoT: vault_locked_balance에서 차감
    "POINT",       # Legacy alias for VAULT
    "CC_POINT",    # Legacy alias for VAULT

    # === 게임 지갑 토큰 (GameWallet) ===
    "DIAMOND",
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "TRIAL_TICKET",
    "GOLD_KEY_FRAGMENT",
    "DIAMOND_FRAGMENT",
    "PUZZLE_C1",
    "PUZZLE_C2",
    "PUZZLE_J",
    "PUZZLE_M",
]

# 게임 토큰 결제 타입 집합 (shop_service 검증용)
GAME_TOKEN_COST_TYPES: frozenset[str] = frozenset({
    "DIAMOND", "ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET",
    "GOLD_KEY_TICKET", "DIAMOND_TICKET", "TRIAL_TICKET",
    "GOLD_KEY_FRAGMENT", "DIAMOND_FRAGMENT",
    "PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M",
})

# =============================================================================
# TicketType - 티켓/코인 타입 (SoT)
# =============================================================================
TicketType = Literal[
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "TRIAL_TICKET",
    "ROULETTE_COIN",
    "DICE_TOKEN",
    "GOLD_KEY",
    "DIAMOND_KEY",
    "TRIAL_TOKEN",
]

# =============================================================================
# GameTokenType - DB Enum과 매핑 (app/models/game_wallet.py 참조)
# =============================================================================
# NOTE: 실제 DB Enum은 app/models/game_wallet.py의 GameTokenType 사용
# 여기는 참조용 Literal만 정의
GameTokenTypeLiteral = Literal[
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "ROULETTE_COIN",
    "DICE_TOKEN",
    "TRIAL_TOKEN",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "VAULT",  # Legacy
]

# =============================================================================
# RouletteGrade - 룰렛 등급
# =============================================================================
RouletteGrade = Literal["COMMON", "VIP", "WHALE", "AT_RISK"]



# =============================================================================
# GameResult - 게임 결과
# =============================================================================
GameResult = Literal["WIN", "LOSE", "DRAW"]
