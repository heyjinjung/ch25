import sys
sys.path.insert(0, ".")
from app.v2.services.vault_service import V2VaultService

svc = V2VaultService
print("=== SEGMENT_WITHDRAWAL_CONDITIONS ===")
for seg, conds in svc.SEGMENT_WITHDRAWAL_CONDITIONS.items():
    print(f"  {seg}: play={conds['play_target']}, spend={conds['spend_target']}, deposit={conds['min_deposit_target']}")

print()
print("=== _get_withdrawal_targets() ===")
for seg in ["NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"]:
    play, spend, deposit = svc._get_withdrawal_targets(seg, 0)
    print(f"  {seg}: play={play}, spend={spend}, deposit={deposit}")

print()
print("=== DB segment -> vault conditions (live) ===")
from app.db.session import SessionLocal
from app.v2.services.segment_service import V2SegmentService

db = SessionLocal()
try:
    for uid in [14, 8, 21, 24, 31, 44]:
        seg = V2SegmentService.get_current_segment(db, uid)
        play, spend, deposit = svc._get_withdrawal_targets(seg, 0)
        print(f"  user_id={uid}: segment={seg} -> play={play}, spend={spend}, deposit={deposit}")
finally:
    db.close()
