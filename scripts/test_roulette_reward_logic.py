
import sys
import os
from unittest.mock import MagicMock

# Add project root to sys.path
sys.path.append(os.getcwd())

def categorize_roulette_reward(rtype, label, amount):
    """
    Duplicate the intended Frontend logic for verification.
    BIG_WIN: POINT (Gold Deposit) or Gold/Diamond Ticket.
    NORMAL: GIFTICON/VOUCHER, Standard Game Tickets, Items/Puzzles.
    FAIL: NONE.
    """
    rtype = rtype.upper()
    label = label.lower()
    
    if rtype == "POINT" or rtype == "CC_POINT":
        return "BIG_WIN"
    if rtype == "TICKET" and ("gold" in label or "diamond" in label):
        return "BIG_WIN"
    
    if rtype in ["GIFTICON", "VOUCHER"]:
        return "NORMAL"
    if rtype == "TICKET":
        return "NORMAL"
    if rtype == "ITEM" or rtype == "PUZZLE":
        return "NORMAL"
        
    if rtype == "NONE":
        return "FAIL"
        
    return "UNKNOWN"

def test_roulette_rewards():
    print("Testing Roulette Reward Categorization Logic...")
    
    test_cases = [
        {"reward_type": "POINT", "label": "100P", "amount": 100, "expected": "BIG_WIN"},
        {"reward_type": "POINT", "label": "50000P", "amount": 50000, "expected": "BIG_WIN"},
        {"reward_type": "TICKET", "label": "Gold Key", "amount": 1, "expected": "BIG_WIN"},
        {"reward_type": "TICKET", "label": "Diamond Ticket", "amount": 1, "expected": "BIG_WIN"},
        {"reward_type": "GIFTICON", "label": "Chicken Gifticon", "amount": 1, "expected": "NORMAL"},
        {"reward_type": "VOUCHER", "label": "CVS 3000 Won", "amount": 1, "expected": "NORMAL"},
        {"reward_type": "TICKET", "label": "Roulette Ticket x1", "amount": 1, "expected": "NORMAL"},
        {"reward_type": "TICKET", "label": "Dice Ticket x5", "amount": 1, "expected": "NORMAL"},
        {"reward_type": "NONE", "label": "꽝", "amount": 0, "expected": "FAIL"},
    ]
    
    for case in test_cases:
        tier = categorize_roulette_reward(case["reward_type"], case["label"], case["amount"])
        print(f"[{case['reward_type']}] {case['label']} -> {tier}")
        assert tier == case["expected"], f"Failed for {case['label']}: expected {case['expected']}, got {tier}"

    print("Roulette Reward Categorization Verification PASSED ✅")

if __name__ == "__main__":
    test_roulette_rewards()
