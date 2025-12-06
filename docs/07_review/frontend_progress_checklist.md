# Frontend Progress Checklist
- Document type: Checklist/Status
- Version: v1.0
- Date: 2025-12-06
- Audience: Frontend/QA/PM

## Environment & Build
- [x] Vite/React app builds cleanly (`npm run build`).
- [ ] API base URLs/envs validated for current backend hosts.
- [ ] Alembic-run backend required before FE QA (DB ready signal surfaced?).

## Feature Gating / Routing
- [x] FeatureGate and today-feature handling present.
- [ ] Reflect backend change: daily limits now unlimited (max_daily=0/999999) in UI copy and status displays.
- [ ] Error states aligned to backend codes (NO_FEATURE_TODAY, INVALID_FEATURE_SCHEDULE, FEATURE_DISABLED).

## Auth & Token Handling
- [ ] Token acquisition/storage (login/signup flow) implemented.
- [ ] Attach Authorization header to API calls; handle 401/403 redirects.
- [ ] Secure storage strategy (httpOnly cookie or well-scoped local storage) decided and implemented.

## Game Screens
- Roulette: [ ] Show 6 segments from API; [ ] handle weight/jackpot labels; [ ] show remaining spins as unlimited when max_daily=0 sentinel.
- Dice: [ ] Display outcome/rewards; [ ] reflect unlimited plays.
- Lottery: [ ] Display active prizes with weight/stock info; [ ] reflect unlimited tickets.
- Ranking: [ ] Read-only list wired to backend snapshot.
- Season Pass: [ ] Status page (level/XP/stamps) wired; [ ] stamp action integrated with backend response; [ ] reward claim UX.

## Error & Loading UX
- [ ] Global error boundary and per-page loading states match docs/11_frontend_error_loading_patterns.md.
- [ ] API errors mapped to user-friendly messages (config invalid, feature disabled, no feature today).

## Testing & QA
- [ ] Update mocks/fallbacks to match current API shapes (unlimited limits, new event_log if exposed).
- [ ] Add integration tests for today-feature flow and each game page.
- [ ] Visual/UX checks per frontend validation checklist (docs/14_frontend_validation_checklist.md).

## Styling & Guidelines
- [ ] Conform to design tokens/variables and component structure (components/ui/*) per docs/09_frontend_components_and_style_system.md.
- [ ] Animations/responsive rules adhered (06_frontend_ui_ux_guidelines.md).
