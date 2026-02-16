문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-16
작성자: GitHub Copilot
도메인: VAULT
상태: 적용 완료

# 출금 조건 FE 세그먼트별 동적 표시 수정

## 1. 증상
- 유저 세그먼트(VIP/WHALE 등)에 따라 출금 조건이 달라야 하지만, 프론트엔드에서 항상 COMMON 기본값(입금 1만원)으로 고정 표시됨
- VIP/WHALE 유저는 실제 필요 입금 조건이 10만원이지만 UI에 "1만원 이상 입금"으로 표시되어 혼란 유발

## 2. 근본 원인 (3건)

### 2.1 VaultStatusResponse 인터페이스 누락
- **파일**: `src/v2/api/vaultApi.ts`
- **문제**: `daily_deposit_target` 필드가 TypeScript 인터페이스에 미정의
- **백엔드**: `vault_service.py` L840에서 세그먼트별 `daily_deposit_target` 정상 반환 중

### 2.2 API 정규화 매핑 누락
- **파일**: `src/v2/api/vaultApi.ts`
- **문제**: `getStatus()` 정규화 로직에서 `daily_deposit_target` 미매핑 → FE에서 값 수신 불가

### 2.3 WithdrawalRulesChecklist prop 미전달
- **파일**: `src/v2/components/vault/V2WithdrawalGuideModal.tsx`
- **문제**: `depositTarget`과 `segment` prop을 전달하지 않아 기본값 `10000`/`COMMON` 고정 표시

## 3. 세그먼트별 정상 조건 (SoT 01_vault_policy_sot_ko.md 섹션 7.2)

| 세그먼트 | 플레이(3일) | 오늘 사용 | 입금 조건 |
|---------|-----------|---------|---------|
| NEW     | 5회       | 0원     | 1만 이상 |
| COMMON  | 15회      | 5,000원 | 1만 이상 |
| VIP     | 10회      | 0원     | 10만 이상 |
| WHALE   | 0회       | 0원     | 10만 이상 |
| AT_RISK | 30회      | 10,000원| 1만 이상 |

## 4. 수정 내역

| 파일 | 변경 내용 |
|------|---------|
| `src/v2/api/vaultApi.ts` | `VaultStatusResponse`에 `daily_deposit_target: number` 추가 |
| `src/v2/api/vaultApi.ts` | `getStatus()` 정규화에 `daily_deposit_target` 매핑 추가 (fallback 10000) |
| `src/v2/components/vault/V2WithdrawalGuideModal.tsx` | `WithdrawalRulesChecklist`에 `depositTarget={vaultData.daily_deposit_target}`, `segment={vaultData.segment}` prop 전달 |

## 5. 검증
- TypeScript 컴파일 에러 0건
- 백엔드 `vault_service.py`의 세그먼트별 `min_deposit_target` 값과 FE 표시가 일치하도록 연결 완료
- `play_target`, `spend_target`은 기존에도 정상 동적 수신 확인
