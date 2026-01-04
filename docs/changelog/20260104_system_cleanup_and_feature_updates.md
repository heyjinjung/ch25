# 2026-01-04 System Cleanup & Feature Updates

## 1. New Member Dice Game Removal (Feature Sunset)
- **Objective**: Remove obsolete new member onboarding game dependent on manual admin eligibility.
- **Frontend Changes**:
  - Removed `NewMemberDicePage`, Admin `NewMemberDiceEligibilityPage`.
  - Removed "New Member Dice" routes and Admin menu item.
- **Backend Changes**:
  - Removed `models.NewMemberDiceEligibility`, `models.NewMemberDiceLog`.
  - Removed related Services, Schemas, and API Routers.
  - Cleaned up dependencies in `VaultService` and `AdminExternalRankingService`.
- **Database**:
  - Created Migration `20260104_1628_2684fc9707df_remove_new_member_dice_tables.py` to drop `new_member_dice_eligibility` and `new_member_dice_log` tables.

## 2. Admin Message Recall (Soft Delete)
- **Objective**: Allow admins to "recall" (hide) sent CRM messages.
- **Implementation**:
  - Added `is_deleted` column to `admin_message` table.
  - Added `DELETE /api/admin/crm/messages/{id}/recall` endpoint.
  - Updated `AdminMessageInbox` fan-out logic to filter deleted messages on read.
  - Added "Recall" button to Admin Message Center UI.

## 3. UI & Localization Refinements
- **Inventory Page**:
  - Renamed "재화 지갑" to "티켓 지갑".
  - Localized item descriptions for vouchers (VOUCHER_DICE_TOKEN_1, VOUCHER_ROULETTE_COIN_1).
  - Translated "Failed to load" to "데이터 로딩 실패".
- **Shop Page**:
  - Fixed broken icon display for Dice Voucher products.
- **Admin Mission Page**:
  - Re-styled the entire page to match the core admin design system (`#91F402`, `#2D6B3B`, and unified table layouts).
  - Improved responsive layout for various screen sizes.

## 4. Message Recall Visibility Fix
- **Backend**:
  - Updated `list_messages` API in `admin_crm.py` to filter out messages with `is_deleted=True`.
  - Applied the `is_deleted` column to the production database via Alembic upgrade.
- **Verification**:
  - Confirmed via test script that recalled messages are hidden from both the User Inbox and Admin History list.

## 5. Stability & Verification
- Verified frontend build passes (`npm run build`).
- Confirmed backward compatibility for existing Season Pass reward logs (no duplicate payouts after config changes).
- Background tasks and Nginx proxy status verified after backend restart.

## 6. Streak Event: Vault Multiplier + Day4~5 Tickets
- **Objective**: Apply streak incentives without changing mission claim payouts.
- **Feature Flags**:
  - `STREAK_VAULT_BONUS_ENABLED` (default OFF): Enables time-window multipliers on *base vault accrual (+200)* only.
  - `STREAK_TICKET_BONUS_ENABLED` (default OFF): Grants Day4~5 tickets once per operational day (KST 00:00 default; follows `STREAK_DAY_RESET_HOUR_KST`) on first play.
- **Backend Changes**:
  - Implemented Day4~5 ticket grants: `LOTTERY_TICKET` x1 + `ROULETTE_COIN` x2 (idempotent per operational day).
  - Ensured atomicity: removed internal `commit()` side-effects when `auto_commit=False` in wallet creation (uses flush instead).
  - Enforced exclusions: vault streak bonus applies only to eligible base games (e.g., Dice `mode==NORMAL`, excludes high-tier roulette keys / trial token).
- **Verification**:
  - Pytest added/updated for Day4/Day5 grant, idempotency, and Day6 no-grant; vault bonus regression covered.

