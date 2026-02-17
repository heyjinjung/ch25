"""운영서버에서 실행: 세그먼트별 출금 조건 API 응답 검증 스크립트"""
import json, sys
sys.path.insert(0, "/app")
from app.db.session import SessionLocal
from app.v2.services.vault_service import V2VaultService
from app.v2.models.user import V2User

db = SessionLocal()
svc = V2VaultService()

test_users = {"AT_RISK": 21, "COMMON": 8, "NEW": 44, "VIP": 24, "WHALE": 31, "VIP_14": 14}
results = {}
for seg, uid in test_users.items():
    user = db.get(V2User, uid)
    if user:
        try:
            info = svc.get_vault_info(db, uid)
            results[seg] = {
                "user_id": uid,
                "segment": info.get("segment"),
                "daily_play_target": info.get("daily_play_target"),
                "daily_vault_spent_target": info.get("daily_vault_spent_target"),
                "daily_deposit_target": info.get("daily_deposit_target"),
                "daily_play_count": info.get("daily_play_count"),
                "daily_vault_spent": info.get("daily_vault_spent"),
                "daily_deposit_confirmed": info.get("daily_deposit_confirmed"),
                "grace_period_active": info.get("grace_period_active"),
            }
        except Exception as e:
            results[seg] = {"user_id": uid, "error": str(e)}
    else:
        results[seg] = {"user_id": uid, "error": "user not found in v2_user"}
db.close()
print(json.dumps(results, indent=2, default=str))
