# 개발일지: Strict Vault Policy & Benefit Suspension 구현
**Date**: 2026-01-17
**Author**: Antigravity AI
**Status**: Deployed (Backend/Frontend)

---

## 1. 개요 (Overview)
고액 금고 보유 무입금자(Free-Rider) 및 장기 미활동(Inactive) 유저를 대상으로 한 **금고 보안 및 혜택 제한 정책(Strict Vault Policy)**을 구현함.
기존의 단순 "적립 배수 하향"을 넘어, **상점 이용 차단** 및 **무입금자 한도 제한**을 통해 실질적인 입금 유인을 제공하는 것이 목표.

## 2. 주요 변경 사항 (Changes)

### 2.1 Backend Policy Logic (`vault_service.py`)
- **Last Deposit Source 변경**: 기존 `UserCashLedger` 대신 **`ExternalRankingData.updated_at` (최종 동기화 일자)**를 유일한 기준(`Source of Truth`)으로 채택.
  - 조건: `deposit_amount > 0` 인 유저에 한함.
  - 이유: 내부 원장의 정합성 문제 해결 및 외부 서버와의 "유효 활동" 기준 통일.
- **Inactive 기준 명확화**: 최종 동기화 일자가 7일 이상 경과된 경우 `INACTIVE` 등급 부여.
- **Zero-Deposit Cap 확대**: 기존 "생애 최초 무입금" 조건 외에 **`INACTIVE` 등급 유저**에게도 **금고 한도 30,000원** 강제 적용.
  - **Reason**: 7일간 입금이 없다면 사실상 Free Tier 유저로 간주하여 보유 한도를 축소함.
- **Timezone Fix**: 입금일(`last_deposit_at`)과 현재 시간(`now`) 비교 시 발생하던 UTC Offset Mismatch 버그 수정 (`_to_utc` 헬퍼 적용).

### 2.2 Serive Layer Enforcement (`benefits_suspended`)
`INACTIVE` 유저에게 `benefits_suspended=True` 플래그가 설정되며, 다음 서비스 이용이 원천 차단됨.
1.  **Shop Service** (`shop_service.py`):
    - 기프티콘, 아이템 구매 시도 시 `403 Forbidden` 에러 반환.
    - Error Detail: `BENEFITS_SUSPENDED` (Header: `X-Reason: DEPOSIT_REQUIRED`)
2.  **Lottery Service** (`lottery_service.py`):
    - 복권(Random Box) 플레이 시도 시 `403 Forbidden` 에러 반환.
    - 경품 당첨 자격 박탈.

### 2.3 Frontend Visual Feedback
1.  **Vault UI** (`VaultPageCompact.tsx`):
    - **Status Badge**: `Active` (Green) / `Warning` (Yellow) / `Inactive` (Red) 배지 표시.
    - **Limit Warning**: 30,000원 한도 도달/초과 시 "⚠️ 한도 초과 (적립 불가)" 경고 노출.
2.  **Shop UI** (`ShopPage.tsx`):
    - **Global Lock**: `benefits_suspended` 상태일 경우, 상점 내 모든 상품에 **🔒 잠금 아이콘** 오버레이.
    - **Button Disabled**: "구매" 버튼이 "🚫 제한됨"으로 변경되고 비활성화.
    - **Msg**: "장기 미활동으로 구매 제한됨 (입금 필요)" 툴팁 제공.

---

## 3. 검증 결과 (Verification)

### 3.1 Backend Test Scenario (`tests/test_strict_policy.py`)
별도의 테스트 스크립트(`test_strict_policy.py`, `test_withdrawal_eligibility.py`)를 작성하여 `ExternalRankingData` 모킹을 포함한 검증 수행.

**Test Output:**
```text
Created User ID: 125
Scenario 1 [New User]: 
  - Status: ACTIVE (Grace Period or Default) 
  - Multiplier: 1.0
  - Limit: 30,000 (Reason: Total Charge 0)
  => Result: PASSED (New users capped at 30k but active)

Scenario 2 [Inactive User]: 
  - Condition: 10 days since last deposit
  - Status: INACTIVE
  - Multiplier: 0.1
  - Suspended: True
  - Limit: 30,000
  => Result: PASSED (Benefits Suspended CHECK OK)

Scenario 3 [Warning User]: 
  - Condition: 5 days since last deposit
  - Status: WARNING
  - Multiplier: 0.5
  - Suspended: False
  - Limit: 0 (Unlimited)
  => Result: PASSED

Scenario 4 [Active User]: 
  - Condition: 1 day since last deposit
  - Status: ACTIVE
  - Multiplier: 1.0
  - Suspended: False
  - Limit: 0 (Unlimited)
  => Result: PASSED
```

### 3.2 Type Check
Frontend TypeScript 정합성 검사 통과.
```bash
$ npx tsc --noEmit
# Result: 0 errors
```

---

## 4. 결론 (Conclusion)
- **보안 강화**: Inactive 유저의 무분별한 파밍 및 경품 수령을 시스템적으로 차단함.
- **UX 개선**: 제재 사실을 유저가 명확히 인지할 수 있도록 UI에 시각적 장치(Lock, Badge)를 마련함.
- **운영 효율**: 자동화된 정책 적용으로 수동 모니터링 소요 감소 예상.

**Next Step**: 배포 후 `Inactive -> Active` 전환율(Re-deposit Rate) 모니터링 필요.
