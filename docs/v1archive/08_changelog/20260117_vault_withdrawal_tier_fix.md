# Changelog: Vault Withdrawal Tier Logic Fix

- **Date**: 2026-01-17
- **Author**: GitHub Copilot (on behalf of JAVIS)
- **Status**: Applied & Verified

## 1. Overview
사용자가 제보한 "1회차 1만 -> 2회차 3만" 로직(기존 문서)과 "10k -> 10k -> 30k -> 50k"(실제 운영 정책) 간의 불일치를 수정했습니다.
프론트엔드와 백엔드 모두에 **"1>1>3>5" (10,000 > 10,000 > 30,000 > 50,000)** 티어 시스템을 적용했습니다.

## 2. Changes

### Backend (`app/services/vault_service.py`)
- `request_withdrawal` 메서드 수정:
    - **Tiered Minimum Amount**: `withdrawal_count` (PENDING + APPROVED) 횟수를 조회하여 최소 출금 가능 금액을 동적으로 검증.
        - **0회 (신규)**: 10,000원
        - **1회**: 10,000원
        - **2회**: 30,000원
        - **3회 이상**: 50,000원
    - **Error Code**: 조건 미달 시 `MIN_WITHDRAWAL_AMOUNT_{amount}_REQUIRED` 에러 반환.

### Frontend (`src/components/modal/WithdrawalProgressModal.tsx`)
- `minWithdrawal` 상수 제거 및 동적 변수화:
    - `withdrawalCount` prop에 따라 목표 금액(Target)을 10k/30k/50k로 자동 조정.
    - UI 게이지 및 안내 텍스트에 반영.

## 3. Impact
- **User UX**: 출금을 많이 할수록 다음 출금 허들이 높아짐 (1만->1만->3만->5만).
- **Operation**: 
    - 기획 의도인 "고액 출금 시 더 많은 플레이 유도"가 정상 작동.
    - 기존 문서(`20260115_withdrawal_ui_and_ops_fix.md`)의 "1회차 1만 -> 2회차 3만" 내용은 이 패치로 대체됨.

## 4. Lottery Sync Fix
- **Issue**: 복권(Lottery) 당첨 시, 획득한 티켓/아이템이 '보유함(Inventory)'이나 상단 지갑(Wallet)에 즉시 반영되지 않는 문제.
- **Cause**: `usePlayLottery` 훅에서 `lottery-status`만 갱신(invalidate)하고, 정작 아이템이 저장되는 `inventory` 쿼리는 갱신하지 않음.
- **Fix**: `src/hooks/useLottery.ts`의 `onSuccess` 콜백에 `queryClient.invalidateQueries({ queryKey: ["inventory"] });` 추가.
- **Result**: 복권 긁는 즉시 인벤토리/지갑 수량이 최신화됨.

## 5. Verification
- **Code**: `app/services/vault_service.py` L1600~ 로직 확인.
- **Hook**: `src/hooks/useLottery.ts` invalidation 로직 확인.
- **Build**: Frontend 빌드 완료 (`npm run build`).

## 6. Additional UX & Logic Fixes (Evening Update)

### A. Vault Main Panel UX (`VaultMainPanel.tsx`)
- **Issue**: 모달 진입 전 "내돈찾기" 버튼 클릭 시, 1회차/2회차 여부와 무관하게 `10,000원` 미만이면 경고창이 뜨는 하드코딩 로직 존재.
- **Fix**: 버튼 클릭 핸들러(`handleWithdrawalClick`) 내 로직을 동적 티어 시스템(1만/1만/3만/5만)으로 교체.
    - 이제 현재 회차(`withdrawalCount`)에 맞는 최소 금액을 정확히 안내함 (예: "3회차는 최소 30,000원 이상...").

### B. Wallet/Header Sync (`useLottery.ts`)
- **Fix**: 복권 당첨 시 `inventory`뿐만 아니라 상단 헤더의 `vault-status` 쿼리도 무효화(`invalidateQueries`)하도록 추가.
- **Effect**: 복권으로 재화 획득 시, 헤더의 다이아/티켓/포인트 숫자가 즉시 최신화됨 (새로고침 불필요).

### C. Withdrawal Count Integrity Check
- **Question**: "유저가 신청 후 어드민이 승인/반려했을 때 카운트가 정확한가?"
- **Verification**: `app/api/routes/vault.py` 및 `vault_service.py` 로직 검증 결과,
    - `withdrawal_count` = `PENDING` (신청 중) + `APPROVED` (승인됨)
    - **반려(REJECTED)**/취소(CANCELLED) 시 카운트에서 제외됨.
    - 즉, 어드민이 승인하면 **높은 티어 유지**, 반려하면 **이전 티어 복귀**가 자동으로 이루어짐을 확인.

---
**Next Step**: Backend/Frontend 배포 시 위 변경사항 모두 **소급 적용**됩니다. (DB 마이그레이션 불필요)
