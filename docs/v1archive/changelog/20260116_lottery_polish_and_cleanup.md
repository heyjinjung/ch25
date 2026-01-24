# Changelog: Lottery UX Polish & Asset Cleanup

## Context
- **Date**: 2026-01-16
- **Scope**: Frontend (Lottery, Assets, Types)
- **Goal**: Unify visual effects for Lottery wins and resolve build warnings/errors.

## Changes

### 1. Lottery UX Update
- **Unified Confetti Effect**: Removed the conditional logic that triggered different effects based on reward amount (e.g., >= 50,000).
- **Behavior**: Now triggers `JackpotExplosion` (full screen confetti) for **ANY** winning result (`reward_type !== 'NONE'`). "God Rays" (`star_rays.png`) effect removed.

### 2. Code Refactoring & Build Fixes
- **Type Standardization**: Renamed `reward_value` to `reward_amount` in `LotteryPrizeDto` and related interfaces (`src/api/lotteryApi.ts`, `src/pages/LotteryPage.tsx`, `src/api/fallbackData.ts`) to match the Backend API response structure continuously.
- **Fixed Build Errors**: Resolved TypeScript errors in `gameFeedApi.ts` (invalid import) and `LotteryPage.tsx` (null safety).

### 3. Asset Cleanup
- **Removed Missing Assets**: Removed all CSS references to non-existent images (`noise.png`, `pattern_noise.png`).
- **CSS Replacement**: Replaced image-based noise textures with Tailwind CSS utilities (e.g., `bg-white/[0.02]`, `mix-blend-overlay`) to maintain visual hierarchy without generating build time 404 warnings.
- **Affected Files**:
  - `src/components/game/LotteryCard.tsx`
  - `src/pages/ExchangePage.tsx`
  - `src/components/survey/SurveyPromptBanner.tsx`
  - `src/components/modal/LimitedOfferModal.tsx`
  - `src/components/modal/WithdrawalConditionsModal.tsx`
  - `src/components/modal/VipPromotionModal.tsx`
  - `src/components/modal/VipEligibilityModal.tsx`
  - `src/components/modal/NewUserWelcomeModal.tsx`
  - `src/components/modal/SeasonPassPromoModal.tsx`
