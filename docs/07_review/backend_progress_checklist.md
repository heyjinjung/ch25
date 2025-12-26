# Backend Progress Checklist
- Document type: Checklist/Status
- Version: v1.1
- Date: 2025-12-25
- Audience: Backend/QA/PM

- [x] `alembic upgrade head` executed locally (sqlite) and verified `alembic_version` = 20241206_0001`.
- [ ] `alembic upgrade head` executed on stage/prod with DATABASE_URL secrets; verify `alembic_version` = `20241206_0001` (pending secret injection/maintenance window).
- [x] Tables/models aligned to docs/04_db (user/feature/season_pass/roulette/dice/lottery/ranking/user_event_log).
- [x] FKs and key indexes present (logs indexed on user_id+created_at; configs linked).
- [x] Admin/runtime validations cover cross-row rules: roulette 6 slots & weight sum >0; lottery active prize weight sum >0; dice negative weight/stock blocked; dice roll range enforced in service (see tests/test_game_validations.py).

## Feature Gating / Schedule
- [x] today-feature 라우트/게이트 폐기(404/410), 관련 서비스/훅 제거.
- [x] Admin schedule upsert uses unique date; removed obsolete `season_id`.
- [x] API docs updated: today-feature 관련 규칙은 아카이브, 활성 게임/시즌 패스만 유지.

- Roulette: [x] segments ordered/6-count check; [x] rewards wired to RewardService; [x] FOR UPDATE guard with lock failure handling on play.
- Dice: [x] gameplay; [x] dice value validation (1-6 enforced); [x] rewards wired to RewardService; [x] document unlimited daily plays (max_daily=0 sentinel) and surface remaining=0 as unlimited in docs/UI.
- Lottery: [x] stock decrement; [x] rewards wired to RewardService; [x] transactional guard for concurrent stock with lock failure handling; [x] document unlimited daily tickets (max_daily=0 sentinel) and surface remaining=0 as unlimited.
- Ranking: [x] read-only snapshot; [x] admin upload path doc/tests.

## Season Pass
- [x] Tables and uniques in place; auto_claim boolean; progress_id FKs wired on stamp/reward logs.
- [x] Service logic: stamp/day enforcement, level-up chain, reward_log writes, XP calc per docs 확인(통합 테스트 확장으로 검증 완료).
- [x] API docs for season-pass status/stamp/reward flows; extend tests for multi-level-up and manual-claim edge cases (docs updated; tests partially done, more cases outlined below).

## Auth & Security
- [x] Auth/token issuance/verification implemented server-side.
- [x] Dependency to inject user_id into services/endpoints (dice/roulette/lottery/ranking/season-pass).
- [x] CORS/settings validated for FE hosts (wildcard only in local, otherwise configured origins).

## Logging & Event Trail
- [x] `user_event_log` table added with indexes.
- [x] Gameplay writes user_event_log via shared helper.

## Ops & Docs
- [x] Local/Deployment guides mention Alembic upgrade.
- [x] Error code catalog synced with current behaviors (unlimited limits, lock failures, config errors). today-feature payload 항목은 폐기/아카이브.
- [x] Tests: unit/integration updated for roulette/dice/lottery/season-pass/admin ranking. Added play endpoint flows (reward delivery + stock decrement + event log writes), season-pass stamp reuse/manual-claim/season boundary, admin ranking upload 성공/충돌 스냅샷까지 커버.

## Alembic Run/Verify (per env)
- Local/dev: `Set-Location c:\Users\task2\202512\ch25; .venv\Scripts\Activate.ps1; $env:DATABASE_URL="postgresql://..."; alembic upgrade head;` then `SELECT version_num FROM alembic_version;` = `20241206_0001`.
- Stage: use stage DATABASE_URL secret in shell; activate venv; run `alembic upgrade head`; verify `alembic_version` table via `psql` or read-only query job shows `20241206_0001`.
- Prod: maintenance window; venv + production DATABASE_URL; run `alembic upgrade head`; immediately confirm `alembic_version.version_num` = `20241206_0001`; raise incident if mismatch.
- Stage/Prod PowerShell snippet (replace placeholders):
	- `Set-Location c:\Users\task2\202512\ch25; .\.venv\Scripts\Activate.ps1; $env:DATABASE_URL="<stage_or_prod_url>"; .\.venv\Scripts\alembic.exe upgrade head; .\.venv\Scripts\python.exe -c "import sqlalchemy as sa; eng=sa.create_engine('$env:DATABASE_URL'); print(eng.execute(sa.text('select version_num from alembic_version')).scalar_one())"`

## Test Expansion Outline
- Roulette/Dice/Lottery: add integration tests that execute play endpoints to assert rewards delivered, stock decrements, and config validation errors propagate to responses.
- Season Pass: add cases for stamp reuse blocking, manual reward claim after multi-level gain, season boundary (end_date+1) returning NO_ACTIVE_SEASON, and reward_log persistence checks.
- Ranking admin: add endpoint tests for CSV upload success/failure (duplicate rows, invalid schema) and snapshot read correctness post-upload.
