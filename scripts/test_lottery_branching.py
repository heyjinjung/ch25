
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from app.db.session import SessionLocal
from app.v2.services.v2_lottery_game_service import V2LotteryGameService
from app.models.user import User
from app.v2.models.user import V2User
from app.v2.models.v2_lottery import V2LotteryConfig


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_KST = ZoneInfo("Asia/Seoul")

def test_lottery_branching():
    db = SessionLocal()
    service = V2LotteryGameService()
    
    # 1. Use User ID 8 (confirmed to exist in both tables)
    test_user_id = 8
    
    logger.info(f"Testing for User ID: {test_user_id}")
    
    # 3. Simulate multiple plays to see branching
    trials = 20
    results = {
        "BIG_WIN": 0,
        "NORMAL": 0,
        "FAIL": 0
    }
    
    logger.info(f"--- Simulating {trials} Lottery Plays ---")
    
    for i in range(trials):
        try:
            # We want to check if it consumes tickets, so we might need to grant them
            # or use a mock. For simplicity in this run, we'll try to play.
            response = service.play(db, user_id=test_user_id)
            prize = response.prize
            reward_type = prize.reward_type
            reward_amount = prize.reward_amount
            label = prize.label
            
            # Tier Classification (Match Updated Frontend Logic)
            is_big_win = (
                reward_type == "POINT" or
                reward_type == "GOLD_KEY_TICKET" or
                reward_type == "DIAMOND_TICKET"
            )
            
            is_normal = (
                not is_big_win and
                ("GIFTICON" in reward_type or
                 reward_type == "VOUCHER" or
                 reward_type in ["DICE_TICKET", "ROULETTE_TICKET", "LOTTERY_TICKET", "TICKET"] or
                 "PUZZLE" in reward_type or
                 "ITEM" in reward_type)
            )
            
            is_fail = not is_big_win and not is_normal
            
            tier = "FAIL"
            if is_big_win: tier = "BIG_WIN"
            elif is_normal: tier = "NORMAL"
            
            results[tier] += 1
            logger.info(f"Trial {i+1}: Result={tier} | Label={label} | Type={reward_type} | Amt={reward_amount}")
            
        except Exception as e:
            logger.error(f"Trial {i+1} failed: {e}")
            if "NOT_ENOUGH_TOKENS" in str(e):
                logger.info("Out of tickets. Granting 100 tickets...")
                from app.v2.services.inventory_service import V2InventoryService
                from app.models.game_wallet import GameTokenType
                V2InventoryService.grant_wallet_tokens(db, test_user_id, GameTokenType.LOTTERY_TICKET, 100, reason="TESTING")
                db.commit()
                continue
            break
            
    logger.info("--- Test Results Summary ---")
    for tier, count in results.items():
        logger.info(f"{tier}: {count} times")
    
    db.close()

if __name__ == "__main__":
    test_lottery_branching()
