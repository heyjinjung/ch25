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
