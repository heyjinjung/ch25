import sys
sys.path.append("c:\\Users\\JAVIS\\ch\\ch25")

from app.schemas.admin_dice import AdminDiceConfigUpdate

try:
    json_str = '{"win_reward_value": 888}'
    d = AdminDiceConfigUpdate.model_validate_json(json_str)
    print(f"Parsed: {d.model_dump(exclude_unset=True)}")
except Exception as e:
    print(f"Error: {e}")
