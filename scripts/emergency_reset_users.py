"""긴급: 민똘이, 참새참새 유저 입금/레벨 초기화 스크립트"""
import sys
sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from app.v2.models.user import V2User

db = SessionLocal()

# 대상 유저 조회
target_nicknames = ["민똘이", "참새참새"]
users = db.query(V2User).filter(V2User.nickname.in_(target_nicknames)).all()

print("=== 현재 상태 ===")
for u in users:
    print(f"ID={u.id}, nickname={u.nickname}, ext={u.external_nickname}")
    print(f"  total_charge_amount={u.total_charge_amount}, level={u.level}")
    print(f"  vault_locked={u.vault_locked_balance}, vault_available={u.vault_available_balance}")

print("\n=== 초기화 실행 ===")
for u in users:
    old_charge = u.total_charge_amount
    old_level = u.level
    old_locked = u.vault_locked_balance
    old_available = u.vault_available_balance
    
    # 초기화
    u.total_charge_amount = 0
    u.level = 0
    u.vault_locked_balance = 0
    u.vault_available_balance = 0
    
    print(f"{u.nickname}:")
    print(f"  charge {old_charge}->0")
    print(f"  level {old_level}->0")
    print(f"  vault_locked {old_locked}->0")
    print(f"  vault_available {old_available}->0")

db.commit()
print("\n✅ 초기화 완료!")

# 확인
users = db.query(V2User).filter(V2User.nickname.in_(target_nicknames)).all()
print("\n=== 초기화 후 상태 ===")
for u in users:
    print(f"ID={u.id}, nickname={u.nickname}")
    print(f"  total_charge_amount={u.total_charge_amount}, level={u.level}")
    print(f"  vault_locked={u.vault_locked_balance}, vault_available={u.vault_available_balance}")

db.close()
