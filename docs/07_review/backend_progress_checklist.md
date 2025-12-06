# Backend Progress Checklist
- Document type: Checklist/Status
- Version: v1.0
- Date: 2025-12-06
- Audience: Backend/QA/PM

- [ ] `alembic upgrade head` executed on target DB (tests use create_all; run upgrade and verify `alembic_version` = 20241206_0001). Env-specific run/verify steps documented below. (Local sqlite run completed and verified `20241206_0001`; stage/prod pending secrets.)
- [x] Tables/models aligned to docs/04_db (user/feature/season_pass/roulette/dice/lottery/ranking/user_event_log).
- [x] FKs and key indexes present (logs indexed on user_id+created_at; configs linked).
- [x] Admin/runtime validations cover cross-row rules: roulette 6 slots & weight sum >0; lottery active prize weight sum >0; dice negative weight/stock blocked; dice roll range enforced in service (see tests/test_game_validations.py).

## Feature Gating / Schedule
- [x] Today-feature gating enforced via `FeatureService` with KST normalization.
- [x] Admin schedule upsert uses unique date; removed obsolete `season_id`.
- [x] API docs updated to reflect schedule rules and errors (NoFeatureToday/InvalidSchedule).

- Roulette: [x] segments ordered/6-count check; [x] rewards wired to RewardService; [x] FOR UPDATE guard with lock failure handling on play.
- Dice: [x] gameplay; [x] dice value validation (1-6 enforced); [x] rewards wired to RewardService; [x] document unlimited daily plays (max_daily=0 sentinel) and surface remaining=0 as unlimited in docs/UI.
- Lottery: [x] stock decrement; [x] rewards wired to RewardService; [x] transactional guard for concurrent stock with lock failure handling; [x] document unlimited daily tickets (max_daily=0 sentinel) and surface remaining=0 as unlimited.
- Ranking: [x] read-only snapshot; [x] admin upload path doc/tests.

## Season Pass
- [x] Tables and uniques in place; auto_claim boolean; progress_id FKs wired on stamp/reward logs.
- [ ] Service logic: confirm stamp/day enforcement, level-up chain, reward_log writes, XP calc per docs (base tests passing; expand scenarios; see test_season_pass.py additions).
- [x] API docs for season-pass status/stamp/reward flows; extend tests for multi-level-up and manual-claim edge cases (docs updated; tests partially done, more cases outlined below).

## Auth & Security
- [x] Auth/token issuance/verification implemented server-side.
- [x] Dependency to inject user_id into services/endpoints (dice/roulette/lottery/ranking/season-pass/today-feature).
- [x] CORS/settings validated for FE hosts (wildcard only in local, otherwise configured origins).

## Logging & Event Trail
- [x] `user_event_log` table added with indexes.
- [x] Gameplay writes user_event_log via shared helper.

## Ops & Docs
- [x] Local/Deployment guides mention Alembic upgrade.
- [ ] Error code catalog synced with current behaviors (unlimited limits, lock failures, config errors, today-feature payload).
- [ ] Tests: add/repair unit/integration for services, especially roulette/dice/lottery/season-pass (baseline unit tests now green; expand season-pass coverage per TODO; outline below). Integration targets: play endpoints reward delivery + stock decrement + event log writes; season-pass stamp reuse/manual-claim/season boundary; admin ranking upload success/failure snapshot correctness.

## Alembic Run/Verify (per env)
- Local/dev: `Set-Location c:\Users\task2\202512\ch25; .venv\Scripts\Activate.ps1; $env:DATABASE_URL="postgresql://..."; alembic upgrade head;` then `SELECT version_num FROM alembic_version;` = `20241206_0001`.
- Stage: use stage DATABASE_URL secret in shell; activate venv; run `alembic upgrade head`; verify `alembic_version` table via `psql` or read-only query job shows `20241206_0001`.
- Prod: maintenance window; venv + production DATABASE_URL; run `alembic upgrade head`; immediately confirm `alembic_version.version_num` = `20241206_0001`; raise incident if mismatch.

## Test Expansion Outline
- Roulette/Dice/Lottery: add integration tests that execute play endpoints to assert rewards delivered, stock decrements, and config validation errors propagate to responses.
- Season Pass: add cases for stamp reuse blocking, manual reward claim after multi-level gain, season boundary (end_date+1) returning NO_ACTIVE_SEASON, and reward_log persistence checks.
- Ranking admin: add endpoint tests for CSV upload success/failure (duplicate rows, invalid schema) and snapshot read correctness post-upload.
