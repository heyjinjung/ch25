# Mission Edit 500 Error Fix Report (2026-01-27)

## 1. Problem Description
- **Error**: 500 Internal Server Error (DB_ERROR) when editing missions with specific reward types.
- **Trigger Payload**:
  ```json
  {
    "category": "WEEKLY",
    "rewardType": "CHICKEN_GIFTICON_5000",
    ...
  }
  ```
- **Root Cause**: The database column `mission.reward_type` (ENUM) was missing the gifticon reward types (e.g., `CHICKEN_GIFTICON_5000`), causing a `DataError` when attempting to persist the new mission data.

## 2. Changes Made
- **Database Migration**: Created and applied migration `20260127_1600_add_missing_mission_gifticons`.
- **ENUM Synchronization**: Added the following missing values to `reward_type`:
    - `CHICKEN_GIFTICON_5000`
    - `CHICKEN_GIFTICON_10000`
    - `STARBUCKS_GIFTICON_2000`
    - `STARBUCKS_GIFTICON_10000`
    - `PIZZA_GIFTICON_5000`
    - `PIZZA_GIFTICON_10000`
    - `GOOGLE_GIFTICON_5000`
    - `GOOGLE_GIFTICON_10000`

## 3. Verification Results
- **Reproduction Tool**: `repro_mission_500.py`
- **Result**: Successfully updated Mission ID 9 with the payload provided by the USER. No more 500 errors.

## 4. Current DB Status
- `mission.category`: `DAILY`, `WEEKLY`, `SPECIAL`, `NEW_USER` (Synced)
- `mission.reward_type`: All V2 types (`CC_POINT`, etc.) and Gifticons are now present.

---
**Status**: Resolved.
**Location**: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/20260127_mission_error_update.md`
