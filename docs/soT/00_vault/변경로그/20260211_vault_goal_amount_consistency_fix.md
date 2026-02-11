# 금고 목표 금액 일관성 개선

**작성일:** 2026-02-11  
**작성자:** GitHub Copilot  
**요청자:** 관리자  
**상태:** SHIPPED

## 요약
금고 출금 목표 금액이 VaultHero(영웅 섹션)와 VaultProgress(게이지) 간 불일치하는 문제를 해결했습니다.

## 문제점

1. **VaultHero의 목표 금액**
   - 이전: `minimum_withdrawal_amount` (백엔드 정책에서 동적 계산)
   - 문제: `minimum_withdrawal_amount`가 FE API 응답 타입에 정의되지 않아 항상 undefined → 기본값 100,000 사용

2. **VaultProgress의 목표 금액**
   - withdrawal_count 기반 VAULT_GOALS 배열 [10000, 10000, 30000, 50000] 사용
   - 정책 SoT와 일치하지만, VaultHero와 불일치

3. **결과적 문제**
   - 같은 회차에서 두 곳이 다른 목표 금액을 표시
   - 예: 출금 횟수 0회차일 때
     - VaultHero: ₩100,000 목표 (잘못된 기본값)
     - VaultProgress: ₩10,000 목표 (정책 기준)

## 해결 방법

### 1. vaultApi.ts 수정
- `BackendVaultStatusResponse` 인터페이스에 `minimum_withdrawal_amount` 필드 추가
- `VaultStatusResponse` 인터페이스에 `minimum_withdrawal_amount` 필드 추가
- `getVaultStatus()` 매퍼 함수에서 `minimum_withdrawal_amount` 값 매핑 추가
- `today_earnings` 필드도 동시 추가

**변경 내용:**
```typescript
// BackendVaultStatusResponse
readonly minimum_withdrawal_amount?: number;
readonly today_earnings?: number;

// VaultStatusResponse  
readonly minimum_withdrawal_amount?: number;
readonly today_earnings?: number;

// getVaultStatus 매퍼
minimum_withdrawal_amount: data.minimum_withdrawal_amount ?? 10000,
today_earnings: data.today_earnings ?? 0,
```

### 2. VaultPage.tsx 수정
- 하드코딩된 `withdrawalGoal = vault?.minimum_withdrawal_amount || 100000` 제거
- withdrawal_count 기반 동적 계산 로직 추가
- `VAULT_WITHDRAWAL_GOALS` 상수 추가 (정책 기반)

**변경 내용:**
```typescript
// 정책 기반 회차별 최소 출금 금액 (SoT 01_vault_policy_sot_ko.md 섹션 7.3)
const VAULT_WITHDRAWAL_GOALS = [10000, 10000, 30000, 50000];

const withdrawalCount = vault?.withdrawal_count || 0;
const currentGoalIndex = Math.min(withdrawalCount, VAULT_WITHDRAWAL_GOALS.length - 1);
const withdrawalGoal = VAULT_WITHDRAWAL_GOALS[currentGoalIndex] || 10000;
```

### 3. VaultProgress.tsx 주석 개선
- VAULT_GOALS 정의 주석을 JSDoc 형식으로 명확화
- SoT 문서 섹션 7.3 참조

**변경 내용:**
```typescript
/**
 * 회차별 금고 출금 목표 금액 배열
 * SoT: docs/SOT/00_vault/01_vault_policy_sot_ko.md - 섹션 7.3
 * withdrawal_count = 0(1회차) → 10,000원
 * withdrawal_count = 1(2회차) → 10,000원  
 * withdrawal_count = 2(3회차) → 30,000원
 * withdrawal_count = 3+(4회차+) → 50,000원
 */
const VAULT_GOALS = [10000, 10000, 30000, 50000];
```

## 정책 근거
- **SoT 문서:** docs/SOT/00_vault/01_vault_policy_sot_ko.md - 섹션 7.3 (회차별 최소 금액)
- **정책 기준:**
  | 회차 | 최소 금액 |
  | --- | --- |
  | 1회 | 10,000 |
  | 2회 | 10,000 |
  | 3회 | 30,000 |
  | 4회 | 50,000 |

## 영향 범위
- **수정 파일:** 3개
  - `src/api/vaultApi.ts`
  - `src/v2/pages/vault/VaultPage.tsx`
  - `src/v2/components/vault/VaultProgress.tsx`
- **영향 컴포넌트:**
  - VaultHero (목표 금액 표시 일관성)
  - VaultProgress (게이지 목표 금액)
  - 금고 페이지 전체

## 검증 항목
- [ ] 프론트엔드 빌드 성공 (npm run build)
- [ ] VaultHero와 VaultProgress의 목표 금액 일치 확인
- [ ] 각 회차별 목표 금액이 정책과 일치하는지 확인:
  - 0회차: ₩10,000
  - 1회차: ₩10,000
  - 2회차: ₩30,000
  - 3회차+: ₩50,000
- [ ] 로컬 환경에서 금고 페이지 렌더링 확인
- [ ] 타입 오류 없음 확인

## 향후 개선사항
1. VAULT_GOALS를 중앙 상수 파일로 통합 검토
2. 정책 변경 시 자동 반영 메커니즘 고려
3. API 응답값과 FE 계산값의 이중 광고 방지
