"""Game token wallet per user and token type."""
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class GameTokenType(str, Enum):
    """V2 Standard Game Token Types (SoT Compliant)
    
    Migration from V1:
    - ROULETTE_COIN → ROULETTE_TICKET
    - DICE_TOKEN → DICE_TICKET  
    - GOLD_KEY → GOLD_KEY_TICKET
    - DIAMOND_KEY → DIAMOND_TICKET
    - DIAMOND_KEY_FRAGMENT → DIAMOND_FRAGMENT
    
    Reference: docs/v2_specs/01_core/v2_item_inventory_sot_ko.md
    """
    # ==== Game Tickets (V2 Standard) ====
    ROULETTE_TICKET = "ROULETTE_TICKET"
    DICE_TICKET = "DICE_TICKET"
    LOTTERY_TICKET = "LOTTERY_TICKET"
    
    # Legacy V1 Aliases (Deprecated - For Migration Compatibility)
    ROULETTE_COIN = "ROULETTE_COIN"  # [DEPRECATED] Use ROULETTE_TICKET
    DICE_TOKEN = "DICE_TOKEN"  # [DEPRECATED] Use DICE_TICKET
    TRIAL_TICKET = "TRIAL_TICKET"
    TRIAL_TOKEN = "TRIAL_TOKEN"  # [DEPRECATED] Use TRIAL_TICKET 
    
    # ==== Premium Tickets (V2 Standard) ====
    GOLD_KEY_TICKET = "GOLD_KEY_TICKET"
    DIAMOND_TICKET = "DIAMOND_TICKET"
    
    # Legacy Premium Aliases (Deprecated)
    GOLD_KEY = "GOLD_KEY"  # [DEPRECATED] Use GOLD_KEY_TICKET
    DIAMOND_KEY = "DIAMOND_KEY"  # [DEPRECATED] Use DIAMOND_TICKET
    
    # ==== Fragments (V2 Standard) ====
    GOLD_KEY_FRAGMENT = "GOLD_KEY_FRAGMENT"
    DIAMOND_FRAGMENT = "DIAMOND_FRAGMENT"
    
    # Legacy Fragment Aliases (Deprecated)
    DIAMOND_KEY_FRAGMENT = "DIAMOND_KEY_FRAGMENT"  # [DEPRECATED] Use DIAMOND_FRAGMENT

    # ==== Puzzle Pieces (Lottery) ====
    PUZZLE_C = "PUZZLE_C"  # [DEPRECATED] Kept for safety
    PUZZLE_C1 = "PUZZLE_C1"
    PUZZLE_C2 = "PUZZLE_C2"
    PUZZLE_J = "PUZZLE_J"
    PUZZLE_M = "PUZZLE_M"
    
    # ==== Currency & Special ====
    DIAMOND = "DIAMOND"  # Mission Reward Currency
    VAULT = "VAULT"      # Vault Balance (Virtual Token for Buy-in)



class UserGameWallet(Base):
    __tablename__ = "user_game_wallet"
    __table_args__ = (UniqueConstraint("user_id", "token_type", name="uq_user_token_type"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(SAEnum(GameTokenType), nullable=False, index=True)
    balance = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="game_wallets")
