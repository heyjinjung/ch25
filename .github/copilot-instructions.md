# Copilot Instructions (XMAS Event System)

## Project shape
- Backend: FastAPI in `app/` (missions/streak, vault, games, admin). DB: MySQL, ORM: SQLAlchemy/Alembic. Settings via `app/core/config.py`.
- Frontend: React + Vite + TypeScript in `src/`. Zustand stores, React Query, Tailwind. Admin pages under `src/admin/`.
- Docs as SoT: see `docs/` (indices in `docs/[20261월첫째주]_핵심문서_인덱스.md`, changelogs in `docs/changelog/`). Follow documented rules before changing behavior.

## Key domains / files
- Missions/Streak: `app/services/mission_service.py`, routes `app/api/routes/mission.py`, admin config via `app_ui_config` (`streak_reward_rules`). Streak rewards are **manual claim**; `claimable_day` drives UI button. Tests in `tests/test_streak_event_spec_midnight.py`.
- Vault & tokens: single SoT is `user.vault_locked_balance`; avoid `cash_balance` writes. Token wallet/ledger: `app/models/game_wallet*.py`, services `app/services/game_wallet_service.py`, UI admin pages `src/admin/pages/GameToken*.tsx`.
- Purge/reset: admin purge endpoint `app/api/admin/routes/admin_users.py` uses `AdminUserService.purge_user()`; guard for optional tables (e.g., `telegram_unlink_request`). Keep purge order (ledger → inventory/wallet → level_xp/segment → vault_status → user) when touching.
- Telegram link/unlink: models `app/models/telegram_link_code.py`, optional `telegram_unlink_request.py`; routes in `app/api/routes/telegram.py`.
- Dice/Roulette/Lottery: services under `app/services/*`, rewards flow into vault/token wallet. Dice uses admin-configured amounts (can be negative) with no hardcoded payouts.
- Frontend streak/daily UX: streak modal `src/components/modal/AttendanceStreakModal.tsx`, mission store `src/stores/missionStore.ts`, daily gift card `src/components/mission/MissionCard.tsx`, homepage modal wiring `src/pages/HomePage.tsx`.

## Workflows / commands
- Backend env: copy `.env.local`→`.env`, run MySQL, then `alembic upgrade head`. Start: `uvicorn app.main:app --reload --port 8000` (activate venv, install `requirements.txt`).
- Frontend: `npm install && npm run dev -- --host --port 5173` (set `VITE_API_URL` in `.env.development`). Build: `npm run build`.
- Useful scripts: `scripts/debug_daily_login_gift.py`, `scripts/debug_streak_reward_claim.py --no-set-rule --day N` for live reward verification; vault migration script `scripts/migrate_cash_balance_to_vault_locked.py` (dry-run/apply).
- Tests: `pytest -q` (backend), `npm run build` (frontend). Streak regression: `pytest -q tests/test_streak_event_spec_midnight.py`.

## Conventions / cautions
- Do **not** overwrite whole files; patch minimally. Read relevant files before editing.
- Respect documented SoT in `docs/` and changelogs under `docs/changelog/`.
- Streak rewards must stay manual-claim; frontend expects `claimable_day` and `onClaim` wired.
- Use `has_table` or guards when accessing optional tables (telegram unlink) in purge/maintenance scripts.
- Keep cash->locked SoT: new rewards should credit inventory/locked vault, not cash_balance.
- Admin files: avoid overwrite accidents (e.g., dashboard routes); append/patch only.


## Operating Mode (MANDATORY)
- Always follow: **PLAN → PATCH → VERIFY → SHIP**
- Never jump to code changes before PLAN is written and accepted.

### PLAN output format (must follow)
A) Triage Summary (facts only, 3–6 lines)
B) Root Cause Hypotheses TOP3 (ranked)
   - Why plausible
   - How to confirm (1 minimal check each)
C) Fix Plan
   - Allowed Files (full paths, max 12)
   - Out of Scope (explicit)
   - Minimal patch strategy (no refactor)
   - Verify Checklist (backend + frontend + DB as applicable)
D) If missing info: ask ONCE with a short list of required artifacts.

### PATCH rules
- Change ONLY Allowed Files.
- Do NOT overwrite whole files; read first then minimal diff patch.
- If a new needed change is outside scope: STOP and propose a follow-up ticket.

### VERIFY rules
- Provide a step-by-step checklist that a human can execute.
- Prefer existing scripts/tests (pytest target, debug scripts) when relevant.

### SHIP rules
- Summarize: changed files + behavior change + risk + rollback
- If behavior changed, update docs/changelog and docs index references.

## Ask first when missing context
- If behavior is unclear, ask once for: API/DB sample, failing log/stack, or exact user flow. Keep scope small and list allowed files before editing.
