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
