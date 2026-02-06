# 2026-01-26 Mission RewardType Enum Drift Update

## 1. Trouble (문제 상황)
- **Symptoms**: When creating/editing missions in the admin page, some reward types (e.g., `ROULETTE_TICKET`, `GOLD_KEY_TICKET`) cause errors or are not saved properly.
- **Root Cause**:
    1. **Frontend/Backend Enum Mismatch**: Backend `MissionRewardType` includes values like `TICKET_ROULETTE`, but frontend `enums.ts` is missing them, causing Zod validation failure.
    2. **Naming Drift**: Admin UI (`REWARD_ITEMS`) uses `ROULETTE_TICKET`, but backend expects `TICKET_ROULETTE`, so mapping fails.

## 2. Solution (해결 방안)
- **Frontend Enum Expansion**: Add all backend (`app/models/mission.py`) reward types to frontend `rewardTypeEnum` in `src/v2/types/enums.ts`.
- **Value Mapping**: Add logic in `MissionManagerPage.tsx` to map dropdown values to backend enum values (`REWARD_TYPE_MAPPING`).

## 3. Changes (변경 사항)

### `src/v2/types/enums.ts`
- Add missing enum values: `TICKET_ROULETTE`, `TICKET_DICE`, `TICKET_LOTTERY`, `GOLD_KEY`, `DIAMOND_KEY`, etc.

### `src/v2/admin/pages/game/MissionManagerPage.tsx`
- Add `REWARD_TYPE_MAPPING` constant:
    ```typescript
    const REWARD_TYPE_MAPPING = {
      ROULETTE_TICKET: "TICKET_ROULETTE",
      // ...
    };
    ```
- Add mapping logic to `MISSION_REWARD_OPTIONS`.
- Update `getRewardIcon` to recognize backend types like `TICKET_ROULETTE`.

## 4. Verification & Notes (검증 및 주의사항)
- **Verification**: Select '룰렛 티켓' in admin → save → check DB for `TICKET_ROULETTE` → icon displays correctly in admin list.
- **Notes**: When adding new reward types, update both `enums.ts` and `MissionManagerPage.tsx` mapping.

---

## Triage Summary
- SoT and backend (enum, shop_enums.json) define many reward types.
- Frontend (src/v2/types/enums.ts) only has 8 types:
  - "POINT", "CC_POINT", "GAME_XP", "DIAMOND", "TICKET", "BUNDLE", "TICKET_BUNDLE", "NONE"

## Root Cause
- Frontend enum not synced with SoT/backend, so missing values cause errors.
- E.g., "ROULETTE_TICKET", "DICE_TICKET", "GOLD_KEY_TICKET" exist in SoT/backend but not frontend.
- Zod validation fails for missing values.

## Fix Plan
- Allowed Files: src/v2/types/enums.ts
- Change: Expand rewardTypeEnum to match SoT/backend (shop_enums.json)
- Verification:
  - Ensure frontend enum includes all SoT/backend reward types
  - No errors for previously missing values

## Ship Notes
- Frontend rewardTypeEnum is out of sync (drift) with SoT/backend
- Must expand/sync frontend enum to SoT/backend
- Recommend automation/tests to prevent future drift

---

> This document records the status and solution for mission rewardType enum drift as of 2026-01-26.
> Location: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/20260126_mission_rewardType_enum_drift_update.md

---

## 5. Inventory / Ticket Verification Updates (2026-01-26 16:45)

### A. Inventory Item Type Mismatch
- **Trouble**: Gifticon rewards (e.g., `CHICKEN_GIFTICON_5000`) were failing to be created in `user_inventory_item` table.
- **Root Cause**: `V2MissionService` was passing the Python Enum object's string representation (e.g., `"MissionRewardType.CHICKEN_GIFTICON_5000"`) instead of the value string (`"CHICKEN_GIFTICON_5000"`).
- **Fix**: Updated `app/v2/services/mission_service.py` to explicitly use `.value`.
  ```python
  target_reward_type = mission.reward_type.value if hasattr(mission.reward_type, "value") else str(mission.reward_type)
  ```

### B. Validation Logic Mismatch (Mission vs Wallet)
- **Trouble**: Automated verification tests failed for Ticket rewards.
- **Root Cause**:
    - **Input**: Admin uses Legacy Enum `MissionRewardType.TICKET_ROULETTE` ("TICKET_ROULETTE").
    - **Process**: `V2RewardService` correctly maps this to V2 Standard `GameTokenType.ROULETTE_TICKET` ("ROULETTE_TICKET") for storage.
    - **Verification Error**: Test script looked for the input string ("TICKET_ROULETTE") in the wallet, incorrectly assuming 1:1 storage without mapping.
- **Learned Principle**: Validation scripts must verify against **Database Source of Truth (GameTokenType)**, not the Input Interface (MissionRewardType).
- **Fix**: Updated validation logic to compare against `GameTokenType.ROULETTE_TICKET`.

---

## 6. MissionsPage 로딩 실패 (streak schema drift) 업데이트 (2026-01-27)

### Trouble (증상)
- 유저 미션 화면에서 “미션을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.”가 표시됨.
- 브라우저 콘솔:
  - `TypeError: Cannot read properties of undefined (reading 'streak_days')`
  - 위치: `src/v2/api/missionApi.ts` 내부 파서

### Root Cause (원인)
- V2 미션 API의 스트릭 정보가 프론트 가정과 다르게 직렬화/필드명이 변경됨.
  - 프론트 가정: `streak_info.streak_days`
  - 백엔드 실제 응답(현재): `streak.current_streak`
- 즉, FE/BE 계약 드리프트로 인해 `streak_info`가 없거나, `streak_days`가 없는 경우 런타임 에러가 발생.

### Fix (해결)
- FE 파서를 백엔드 실제 응답과 호환되도록 보강:
  - `streak_info ?? streak`로 입력을 수용
  - `current_streak ?? streak_days ?? 0`로 안전 파싱

### Verification (검증)
- `npm run build` 통과
- 미션 페이지 진입 시 `streak_days` undefined 런타임 에러가 발생하지 않아야 함
