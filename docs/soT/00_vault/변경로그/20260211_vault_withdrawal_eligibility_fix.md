문서 타입: 변경로그/트러블슈팅
작성일: 2026-02-11
작성자: GitHub Copilot
도메인: VAULT
심각도: CRITICAL (출금 조건 우회 가능)

## 증상

| 항목 | 내용 |
|---|---|
| **대상 기능** | 금고 출금 버튼 활성화 및 출금 신청 |
| **HTTP Status** | 200 (Logic Error — 조건 미충족인데 버튼 활성화) |
| **영향 범위** | 전체 유저 (특히 NEW 세그먼트) |
| **재현 빈도** | 항상 |

### 재현 시나리오

1. 유저가 당일 입금을 하지 않음 (daily_deposit_confirmed=false)
2. 그러나 `vault.eligible=true` (프로그램 레벨 자격만 확인)
3. `vaultBalance >= withdrawalGoal` 이면 출금 버튼 활성화 (초록색)
4. 클릭 → 출금 신청 다이얼로그 표시 → BE 400/403 에러 반환
5. NEW 세그먼트의 경우: `min_deposit_target=0`이므로 BE 검증도 통과 → 입금 없이 출금 가능

## 근본 원인 (Root Cause)

### 원인 1: FE isEligible 계산 불완전 (VaultPage.tsx L117)

```tsx
// Before (버그)
const isEligible = vault.eligible && vaultBalance >= withdrawalGoal;
```

- `vault.eligible`은 프로그램 레벨 자격만 확인 (Vault2Service.get_eligibility)
- 일일 입금(daily_deposit_confirmed), 플레이 횟수, 소비 금액 미검증
- 결과: 조건 미충족 유저에게 출금 버튼 활성화

### 원인 2: BE NEW 세그먼트 입금 조건 면제 (vault_service.py)

```python
# Before (버그)
if "NEW" in segments:
    min_deposit_target = 0  # SoT 위반!
```

- SoT 7.2에 따르면 NEW 세그먼트도 "당일 1만 이상" 입금 필요
- `min_deposit_target = 0`이면 `if min_deposit_target > 0:` 블록이 스킵
- 결과: NEW 유저가 입금 없이 출금 가능

### 원인 3: BE daily_deposit_confirmed 판정 부정확 (vault_service.py)

```python
# Before (버그)
has_cc_deposit_today = int(delta_today) > 0  # 1원이라도 있으면 True
"daily_deposit_confirmed": bool(has_cc_deposit_today)
```

- 금액이 세그먼트별 최소 목표(min_deposit_target)를 충족하는지 확인하지 않음
- 예: COMMON 세그먼트 → 1만원 필요, 1천원만 입금해도 `daily_deposit_confirmed=true`

## 수정 내용

### 1. FE VaultPage.tsx — isEligible 전체 조건 검증

```tsx
// After (수정)
const isDepositMet = vault.daily_deposit_confirmed ?? false;
const isPlayMet = (vault.daily_play_count ?? 0) >= (vault.daily_play_target ?? 0);
const isSpendMet = (vault.daily_vault_spent ?? 0) >= (vault.daily_vault_spent_target ?? 0);
const isBalanceMet = vaultBalance >= withdrawalGoal;
const isEligible = vault.eligible && isBalanceMet && isDepositMet && isPlayMet && isSpendMet;
```

### 2. FE VaultPage.tsx — handleWithdraw 전체 조건 검증

```tsx
// After (수정)
const handleWithdraw = async () => {
    if (!vault || !isEligible) {  // vault.eligible → isEligible
      setShowGuideModal(true);
      return;
    }
```

### 3. BE vault_service.py — get_vault_info NEW 세그먼트 수정

```python
# After (수정)
if "NEW" in segments:
    play_target = 5
    spend_target = 0
    min_deposit_target = 10000  # SoT 7.2: NEW도 당일 1만 이상
```

### 4. BE vault_service.py — request_withdrawal NEW 세그먼트 수정

(동일하게 min_deposit_target = 10000으로 수정)

### 5. BE vault_service.py — daily_deposit_confirmed 금액 검증

```python
# After (수정)
if min_deposit_target <= 0:
    deposit_requirement_met = True
elif int(delta_today) >= min_deposit_target:
    deposit_requirement_met = True
elif has_cc_deposit_today and int(delta_today) > 0:
    deposit_requirement_met = int(delta_today) >= min_deposit_target
else:
    deposit_requirement_met = False

"daily_deposit_confirmed": bool(deposit_requirement_met),  # 금액 충족 여부
```

### 6. API 응답 필드 추가

```python
"play_requirement_met": bool(play_requirement_met),
"spend_requirement_met": bool(spend_requirement_met),
```

## 수정 파일

| 파일 | 변경 |
|------|------|
| app/v2/services/vault_service.py | get_vault_info: NEW 세그먼트 10000, daily_deposit_confirmed 금액검증 |
| app/v2/services/vault_service.py | request_withdrawal: NEW 세그먼트 10000 |
| src/v2/pages/vault/VaultPage.tsx | isEligible 전체 조건 검증, handleWithdraw 수정 |
| src/v2/api/vaultApi.ts | VaultStatusResponse 타입에 play/spend_requirement_met 추가 |
| src/api/vaultApi.ts | 레거시 타입에 play/spend_requirement_met 추가 |

## 검증

- FE 빌드: ✅ tsc && vite build 성공
- BE 배포: ✅ docker compose up -d --build 성공
- 조건 미충족 시 버튼 비활성화(회색) 확인 필요
- NEW 세그먼트 입금 없이 출금 차단 확인 필요

## SoT 준수 확인

| SoT 항목 | 코드 반영 |
|----------|----------|
| NEW 당일 1만 이상 | ✅ min_deposit_target = 10000 |
| COMMON 당일 1만 이상 | ✅ 기존 유지 |
| VIP 당일 10만 이상 | ✅ 기존 유지 |
| WHALE 당일 10만 이상 | ✅ 기존 유지 |
| AT_RISK 당일 1만 이상 | ✅ 기존 유지 |

## 배포

```bash
docker compose build --no-cache; docker compose up -d
```
