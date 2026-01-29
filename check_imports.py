
import os
import ast

MODEL_DIR = r"C:\Users\JAVIS\ch\ch25\app\v2\models"

def get_classes_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            tree = ast.parse(f.read())
        except Exception:
            return []
    classes = [node.name for node in tree.body if isinstance(node, ast.ClassDef)]
    return classes

print("Checking exports...")

expected_exports = {
    "v2_admin_message.py": ["V2AdminMessage"],
    "v2_dice.py": ["V2DiceLog"],
    "v2_exchange_log.py": ["V2ExchangeLog"],
    "v2_golden_intervention_log.py": ["V2GoldenInterventionLog"],
    "v2_level_reward.py": ["V2LevelRewardTable"],
    "v2_lottery.py": ["V2LotteryLog", "V2LotteryTicket"],
    "v2_ops_execution_result.py": ["V2OpsExecutionResult"],
    "v2_retention_roi_log.py": ["V2RetentionRoiLog"],
    "v2_roulette.py": ["V2RouletteLog"],
    "v2_segment_rule.py": ["V2SegmentRule"],
    "v2_shop_order.py": ["V2ShopOrder"],
    "v2_ticket_conversion_policy.py": ["V2TicketConversionPolicy", "V2TicketConversionLog"],
    "v2_ticket_zero_log.py": ["V2TicketZeroLog"],
    "v2_user_retention_state.py": ["V2UserRetentionState"],
    "v2_user_segment.py": ["V2UserSegment"],
}

for filename, class_names in expected_exports.items():
    filepath = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(filepath):
        print(f"[MISSING FILE] {filename}")
        continue
    
    defined_classes = get_classes_in_file(filepath)
    for class_name in class_names:
        if class_name not in defined_classes:
            print(f"[MISSING CLASS] {class_name} not found in {filename}. Defined: {defined_classes}")
        else:
            print(f"[OK] {class_name} in {filename}")
