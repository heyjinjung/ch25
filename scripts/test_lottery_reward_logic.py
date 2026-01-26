
import sys
import os
from unittest.mock import MagicMock, patch
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.v2.services.v2_lottery_game_service import V2LotteryGameService

def categorize_lottery_prize(prize):
    """
    Duplicate the intended Frontend logic for verification.
    BIG_WIN: POINT anywhere, or Gold/Diamond Ticket.
    NORMAL: GIFTICON/VOUCHER, Standard Game Tickets, Items/Puzzles.
    FAIL: NONE.
    """
    rtype = prize.reward_type
    label = prize.label.lower()
    
    if rtype == "POINT":
        return "BIG_WIN"
    if rtype == "TICKET" and ("gold" in label or "diamond" in label):
        return "BIG_WIN"
    
    if rtype in ["GIFTICON", "VOUCHER"]:
        return "NORMAL"
    if rtype == "TICKET":
        return "NORMAL"
    if rtype == "ITEM" or rtype == "PUZZLE": # Any items or puzzles mentioned in plan
        return "NORMAL"
        
    if rtype == "NONE":
        return "FAIL"
        
    return "UNKNOWN"

def test_lottery_prizes():
    print("Testing Lottery Prize Categorization Logic...")
    
    test_cases = [
        {"reward_type": "POINT", "label": "100P", "expected": "BIG_WIN"},
        {"reward_type": "POINT", "label": "10000P", "expected": "BIG_WIN"},
        {"reward_type": "TICKET", "label": "Gold Key", "expected": "BIG_WIN"},
        {"reward_type": "TICKET", "label": "Diamond Ticket", "expected": "BIG_WIN"},
        {"reward_type": "GIFTICON", "label": "Starbucks Coffee", "expected": "NORMAL"},
        {"reward_type": "VOUCHER", "label": "5,000 Won Voucher", "expected": "NORMAL"},
        {"reward_type": "TICKET", "label": "Dice Ticket x3", "expected": "NORMAL"},
        {"reward_type": "TICKET", "label": "Lottery Ticket x1", "expected": "NORMAL"},
        {"reward_type": "NONE", "label": "꽝", "expected": "FAIL"},
    ]
    
    for case in test_cases:
        prize = MagicMock()
        prize.reward_type = case["reward_type"]
        prize.label = case["label"]
        
        tier = categorize_lottery_prize(prize)
        print(f"[{case['reward_type']}] {case['label']} -> {tier}")
        assert tier == case["expected"], f"Failed for {case['label']}: expected {case['expected']}, got {tier}"

    print("Lottery Prize Categorization Verification PASSED ✅")

if __name__ == "__main__":
    try:
        test_lottery_prizes()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
