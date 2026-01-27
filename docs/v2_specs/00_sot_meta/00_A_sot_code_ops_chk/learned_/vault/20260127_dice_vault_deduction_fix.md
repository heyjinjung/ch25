# V2 주사위 게임 금고 차감 버그 수정

**작성일**: 2026-01-27  
**상태**: ✅ 해결됨  
**영향 범위**: V2 주사위/룰렛/복권 게임의 LOSE 결과 시 금고 차감

---

## 1. 문제 요약

V2 주사위 게임에서 **티켓은 차감**되지만 **금고 잔액이 차감되지 않는** 문제 발생.

### 증상
```json
{
  "reward_config": {
    "lose_reward_type": "POINT",
    "lose_reward_amount": -200
  }
}
```
- LOSE 결과 시 `-200` POINT 차감이 예상되나, 실제 `vault_locked_balance` 변동 없음
- 에러 로그 없음

---

## 2. 근본 원인 분석

### 2.1 Vault Limit 조기 종료 버그

**파일**: `app/services/vault_service.py` L796-802

**문제 코드** (Before):
```python
# Check Zero-Deposit Limit (30,000 KRW)
vault_limit = policy["vault_max_limit"]
if vault_limit > 0:
    current_locked = int(getattr(user, "vault_locked_balance", 0) or 0)
    if current_locked >= vault_limit:
        # Already at or above limit -> No more accrual
        return 0  # ❌ 음수 amount(손실)도 여기서 차단됨!
```

### 2.2 상황 재현

| 항목 | 값 |
|------|------|
| User 15 `vault_locked_balance` | 30,000 |
| `vault_max_limit` | 30,000 |
| 게임 결과 | LOSE |
| 예상 차감 | -200 |

**결과**: limit 체크에서 `current_locked >= vault_limit` (30000 >= 30000) 조건이 참이므로,  
음수 amount(-200)도 처리되지 않고 `return 0`으로 조기 종료됨.

---

## 3. 해결 방안

### 3.1 코드 수정

**파일**: `app/services/vault_service.py`

**핵심 변경 1**: limit 조기 체크 제거
```python
# Before (버그)
vault_limit = policy["vault_max_limit"]
limit_reached = False
if vault_limit > 0:
    current_locked = int(getattr(user, "vault_locked_balance", 0) or 0)
    if current_locked >= vault_limit:
        limit_reached = True  # ❌ 이 시점의 값이 stale할 수 있음

# After (수정)
vault_limit = policy["vault_max_limit"]
# NOTE: limit 체크는 amount 계산 후 db.refresh(user) 이후에 수행
```

**핵심 변경 2**: amount 계산 후 최신 잔액으로 limit 체크
```python
# Final Amount
amount = int(amount)

# [Strict] Re-fetch current balance for accurate limit check
# (user object may have stale data if modified in same session)
db.refresh(user)
current_locked = int(getattr(user, "vault_locked_balance", 0) or 0)

# [Strict] If limit reached and amount is POSITIVE, block accrual.
# Negative amounts (losses) should ALWAYS be processed to deduct from vault.
if vault_limit > 0 and amount > 0 and current_locked >= vault_limit:
    return 0

# [Strict] If limiting, clamp final balance for positive amounts
if vault_limit > 0 and amount > 0:
    if current_locked + amount > vault_limit:
        amount = max(0, vault_limit - current_locked)

if amount == 0:
    return 0
```

### 3.2 핵심 변경 사항

1. **조기 종료 제거**: limit 체크에서 즉시 `return 0` 하지 않고 플래그(`limit_reached`)만 설정
2. **음수 허용**: amount 계산 후 `limit_reached and amount > 0`일 때만 차단
3. **손실 처리 보장**: 음수 amount(LOSE 결과)는 limit에 관계없이 항상 처리

---

## 4. 테스트 결과

### 4.1 시나리오 테스트 (30000 limit)

| 순서 | 초기 잔액 | 결과 | 예상 | 실제 반환 | 최종 잔액 | 상태 |
|------|----------|------|------|----------|----------|------|
| 1 | 30000 | WIN | 차단 | 0 | 30000 | ✅ |
| 2 | 30000 | LOSE | -200 | -200 | 29800 | ✅ |
| 3 | 29800 | WIN | +200 | 200 | 30000 | ✅ |
| 4 | 30000 | WIN | 차단 | 0 | 30000 | ✅ |

---

## 5. 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/services/vault_service.py` L796-802 | limit 조기 종료 버그 수정 |
| `app/services/vault_service.py` L923-926 | limit_reached 체크를 amount 계산 후로 이동 |

---

## 6. 영향받는 기능

| 게임 | 영향 |
|------|------|
| V2 주사위 (Dice) | LOSE 시 금고 차감 정상화 |
| V2 룰렛 (Roulette) | 꽝(0) 또는 손실 세그먼트 처리 정상화 |
| V2 복권 (Lottery) | 꽝 결과 시 처리 정상화 |

---

## 7. 검증 체크리스트

- [x] LOSE 결과 시 음수 금액 차감 정상
- [x] WIN 결과 시 limit까지만 적립 (기존 동작 유지)
- [x] limit 미달 상태에서 정상 적립
- [x] 백엔드 재시작 후 동작 확인

---

## 8. 교훈

### 8.1 Limit 체크 시 고려사항
- **양수 적립**만 limit으로 제한해야 함
- **음수 차감**은 항상 허용 (잔액 감소이므로 limit 초과 위험 없음)

### 8.2 디버깅 순서
1. `enable_game_earn_events` 설정 확인
2. `_eligible()` 체크 결과 확인
3. `vault_max_limit`과 현재 잔액 비교
4. `amount_before_multiplier` 값 확인

---

## 9. 관련 문서

- V2 금고 정책: `docs/v2_specs/03_vault/v2_vault_policy_ko.md`
- 게임 보상 흐름: `docs/v2_specs/02_game/v2_game_engine_sot_ko.md`

---

**문서 끝**
