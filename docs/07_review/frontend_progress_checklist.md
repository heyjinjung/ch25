# Frontend Progress Checklist
- Document type: Checklist/Status
- Version: v1.1
- Date: 2025-12-09
- Audience: Frontend/QA/PM

## Environment & Build
- [x] Vite/React app builds cleanly (`npm run build`).
- [x] API base URLs/envs validated for current backend hosts (httpClient warns when falling back to localhost; VITE_API_BASE_URL/VITE_API_URL expected for stage/prod).
- [ ] Alembic-run backend required before FE QA (DB ready signal surfaced?).
	- Note: New migration 20251207_0002 adds feature_config columns + seeds (demo user, roulette schedule today, season pass). Pending `alembic upgrade head` on target DB; if columns already altered manually, apply on clean DB or adjust to avoid duplicate-column errors.

## Feature Gating / Routing
- [x] FeatureGate and today-feature handling present.
- [x] Reflect backend change: daily limits now unlimited (max_daily=0/999999) in UI copy and status displays.
- [x] Error states aligned to backend codes (NO_FEATURE_TODAY, INVALID_FEATURE_SCHEDULE, FEATURE_DISABLED).

## Auth & Token Handling
- [x] Token acquisition/storage (login/signup flow) implemented — userAuth.ts created.
- [x] Attach Authorization header to API calls; handle 401/403 redirects (bearer from access_token/token if present; redirect to / on 401/403).
- [ ] Secure storage strategy (httpOnly cookie or well-scoped local storage) decided and implemented (currently localStorage).

## Game Screens
- Roulette: [x] Show 6 segments from API; [ ] handle weight/jackpot labels; [x] show remaining spins as unlimited when max_daily=0 sentinel.
- Dice: [x] Display outcome/rewards; [x] reflect unlimited plays.
- Lottery: [x] Display active prizes with weight/stock info; [x] reflect unlimited tickets.
- Ranking: [x] Read-only list wired to backend snapshot.
- Season Pass: [x] Status page (level/XP/stamps) wired; [x] stamp action integrated with backend response; [x] reward claim UX.

## Error & Loading UX
- [x] Global error boundary and per-page loading states match docs/11_frontend_error_loading_patterns.md.
- [x] API errors mapped to user-friendly messages (config invalid, feature disabled, no feature today).

## Testing & QA
- [ ] Update mocks/fallbacks to match current API shapes (unlimited limits, new event_log if exposed).
	- Note: Ensure front-end mocks reflect config_json/title/page_path fields if consuming feature_config.
- [x] Add integration tests for today-feature flow and each game page (Vitest + RTL cover roulette/dice/lottery error/unlimited states).
- [ ] Visual/UX checks per frontend validation checklist (docs/14_frontend_validation_checklist.md).

## Styling & Guidelines
- [ ] Conform to design tokens/variables and component structure (components/ui/*) per docs/09_frontend_components_and_style_system.md.
- [ ] Animations/responsive rules adhered (06_frontend_ui_ux_guidelines.md).
