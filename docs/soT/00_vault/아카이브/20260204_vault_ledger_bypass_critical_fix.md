문서 타입: 패치 내역
날짜: 2026-02-04 18:00
심각도: P0 (CRITICAL)
도메인: VAULT
상태: 완료 ✅

# VaultLedger 우회 경로 4개 긴급 수정

## 문제 요약
금고 변경 내역 추적 시스템(VaultLedger)을 우회하여 직접 `vault_locked_balance`를 수정하는 4개 경로가 발견됨.
프로덕션 DB에 27개 레코드만 존재(수천 건 예상)하여 **감사 추적 체계 완전 붕괴** 상태였음.

## 영향 범위
- **어드민 금고 내역 조회**: 대부분의 금고 변경 내역 미표시
- **감사/추적**: 수동 조정, 롤백, 리셋 작업 기록 전무
- **운영**: 티켓/인벤토리 정합성 파악 불가

## 발견된 우회 경로

### 1. vault2_service.py:866 - update_balance()
**문제**: 관리자 수동 조정 시 UserCashLedger만 기록, VaultLedger 누락

**BEFORE**:
```python
# Line 866
user.vault_locked_balance = new_locked
# No VaultLedger record
```

**AFTER**:
```python
from app.v2.models import VaultLedger
vault_ledger = VaultLedger(
    user_id=user_id,
    amount=int(locked_delta),
    balance_after=new_locked,
    reason=reason or "ADMIN_ADJUST",
    ref_type="ADMIN",
    created_at=now_dt
)
db.add(vault_ledger)
user.vault_locked_balance = new_locked
```

### 2. vault2_service.py:958 - set_balance()
**문제**: 관리자 강제 설정 시 VaultLedger 누락

**BEFORE**:
```python
# Line 958
user.vault_locked_balance = int(next_locked)
```

**AFTER**:
```python
from app.v2.models import VaultLedger
vault_ledger = VaultLedger(
    user_id=user_id,
    amount=int(locked_delta),
    balance_after=next_locked,
    reason=reason or "ADMIN_SET_BALANCE",
    ref_type="ADMIN",
    created_at=now_dt
)
db.add(vault_ledger)
user.vault_locked_balance = int(next_locked)
```

### 3. rollback_service.py:132 - recover_from_oversend()
**문제**: 롤백/회수 작업 시 주석만 존재, VaultLedger 미구현

**BEFORE**:
```python
# VaultService를 통해 차감  ← 주석만 존재
user.vault_locked_balance = current_balance - recoverable
db.commit()
```

**AFTER**:
```python
from app.v2.models import VaultLedger
from datetime import datetime

user.vault_locked_balance = current_balance - recoverable

vault_ledger = VaultLedger(
    user_id=user_id,
    amount=-recoverable,
    balance_after=current_balance - recoverable,
    reason=admin_memo,
    ref_type="ROLLBACK",
    created_at=datetime.utcnow()
)
db.add(vault_ledger)
db.commit()
```

### 4. user_routes.py:697 - reset_user()
**문제**: 유저 금고 리셋 시 로그 없음

**BEFORE**:
```python
if payload.reset_vault:
    user.vault_locked_balance = 0
    user.vault_available_balance = 0
```

**AFTER**:
```python
if payload.reset_vault:
    from app.v2.models import VaultLedger
    from datetime import datetime
    
    locked_delta = -int(user.vault_locked_balance or 0)
    if locked_delta != 0:
        vault_ledger = VaultLedger(
            user_id=user_id,
            amount=locked_delta,
            balance_after=0,
            reason=f"ADMIN_RESET:admin_{admin_id}",
            ref_type="ADMIN",
            created_at=datetime.utcnow()
        )
        db.add(vault_ledger)
    
    user.vault_locked_balance = 0
    user.vault_available_balance = 0
```

## 검증 완료 경로
다음 경로는 이미 VaultLedger를 올바르게 기록하고 있음:
- ✅ `vault_service.py:250` - deposit() 
- ✅ `vault_service.py:308` - withdraw()
- ✅ `vault_service.py:367` - consume_locked_for_spend()
- ✅ `vault_service.py:1036` - handle_game_result()
- ✅ `reward_service.py:88` - _grant_vault_locked() → V2VaultService.deposit 호출 (2026-02-04 14:00 패치)

## 아키텍처 원칙 재확립

### ❌ 금지 사항
```python
# NEVER DO THIS
user.vault_locked_balance = 1000  # Direct modification
user.vault_locked_balance += 500
user.vault_locked_balance -= 200
```

### ✅ 올바른 방법
```python
# ALWAYS USE SERVICE LAYER
V2VaultService.deposit(db, user_id=user_id, amount=500, reason="ADMIN", ref_type="ADMIN")
V2VaultService.withdraw(db, user_id=user_id, amount=200, reason="ADMIN", ref_type="ADMIN")

# OR EXPLICITLY LOG
from app.v2.models import VaultLedger
vault_ledger = VaultLedger(
    user_id=user_id,
    amount=delta,
    balance_after=new_balance,
    reason=reason,
    ref_type=ref_type,
    created_at=datetime.utcnow()
)
db.add(vault_ledger)
user.vault_locked_balance = new_balance
```

## 배포 후 검증
```sql
-- 레코드 수 증가 확인
SELECT COUNT(*) FROM vault_ledger;

-- 최신 10개 확인
SELECT id, user_id, amount, balance_after, reason, ref_type, created_at 
FROM vault_ledger 
ORDER BY id DESC 
LIMIT 10;

-- ref_type별 분포 확인
SELECT ref_type, COUNT(*) as cnt 
FROM vault_ledger 
GROUP BY ref_type;
```

## 관련 문서
- [W06_VAULT_troubleshooting.md](../../../../90_troubleshooting/W06_VAULT_troubleshooting.md)
- [20260204_vault_ledger_reward_alignment.md](./20260204_vault_ledger_reward_alignment.md)
- [08.vault.md](./08.vault.md)

## 변경 이력
- 2026-02-04 18:00: 4개 우회 경로 수정 완료
- 2026-02-04 18:05: 백엔드 재시작 (docker compose restart backend)
- 2026-02-04 18:10: 문서 작성 완료
