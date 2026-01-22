"""Game token wallet per user and token type."""
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class GameTokenType(str, Enum):
    """V2 Standard Game Token Types (SoT Compliant) with V1 Compatibility.
    
    Reference: docs/v2_specs/01_core/v2_item_inventory_sot_ko.md
    """
    # ==== V2 Standard Names (Preferred) ====
    ROULETTE_TICKET = "ROULETTE_TICKET"
    DICE_TICKET = "DICE_TICKET"
    LOTTERY_TICKET = "LOTTERY_TICKET"
    GOLD_KEY_TICKET = "GOLD_KEY_TICKET"
    DIAMOND_TICKET = "DIAMOND_TICKET"
    GOLD_KEY_FRAGMENT = "GOLD_KEY_FRAGMENT"
    DIAMOND_FRAGMENT = "DIAMOND_FRAGMENT"
    TRIAL_TICKET = "TRIAL_TICKET"
    DIAMOND = "DIAMOND"
    
    # ==== Legacy V1 Compatibility (Required for existing DB entries and constructors) ====
    ROULETTE_COIN = "ROULETTE_COIN"
    DICE_TOKEN = "DICE_TOKEN"
    GOLD_KEY = "GOLD_KEY"
    DIAMOND_KEY = "DIAMOND_KEY"
    DIAMOND_KEY_FRAGMENT = "DIAMOND_KEY_FRAGMENT"
    TRIAL_TOKEN = "TRIAL_TOKEN"
    
    # ==== Puzzle Pieces (Lottery) ====
    PUZZLE_C = "PUZZLE_C" 
    PUZZLE_C1 = "PUZZLE_C1"
    PUZZLE_C2 = "PUZZLE_C2"
    PUZZLE_J = "PUZZLE_J"
    PUZZLE_M = "PUZZLE_M"
    
    # ==== Special ====
    VAULT = "VAULT"


class UserGameWallet(Base):
    __tablename__ = "user_game_wallet"
    __table_args__ = (UniqueConstraint("user_id", "token_type", name="uq_user_token_type"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(SAEnum(GameTokenType), nullable=False, index=True)
    balance = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="game_wallets")
