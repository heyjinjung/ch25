# DB Validation for Frontend-Backend Sync

- Document type: Review/Status
- Version: v1.1
- Date: 2025-12-25
- Author: Backend review
- Audience: Backend/Frontend leads, QA

## 1. Purpose
Evaluate how well current database schema and validation support consistent frontend-backend API behavior. today-feature 흐름은 2025-12-25 기준 폐기되어 역사적 참고로만 남김.

## 2. Scope
- DB schema vs. docs/04_db and module specs
- API <> DB alignment for roulette/dice/lottery/ranking/season-pass and feature schedule
- Migration readiness and operational checks

## 3. Status Snapshot
- Schema coverage: OK (tables/models aligned with docs after recent updates)
- Constraints/indexes: Per-row FKs/indexes present; cross-row rules enforced in services with tests (roulette 6 slots & weight sum > 0, lottery active weight > 0/stock, dice roll range 1-6).
- Migrations: Pending for stage/prod (local sqlite run completed and verified `20241206_0001`; real DBs still need `alembic upgrade head`).
- API sync: Improved (daily-limit fields default 0/unlimited). today-feature payload는 폐기되어 관리 대상 아님. Error catalog sync still open.
- Tests: Green (pytest suite including new integration tests for roulette/dice/lottery play, season-pass edge cases, admin ranking upload) on in-memory SQLite using StaticPool create_all.
- Front/Docs sync: Unlimited-limit behavior documented; today-feature 관련 문구는 폐기 상태로 정리 필요; error catalog alignment pending.

## 4. Findings (by area)
- Core tables: user, feature_schedule, feature_config now match doc fields; config_json now JSON. user_event_log added with indexes.
- Season pass: Constraints (unique, FK) match docs; auto_claim is boolean; CASCADE FKs present. stamp/reward logs now carry progress_id FK; service logic enforces one-stamp-per-day and reward logs in tests, but broader doc-alignment still needed.
- Roulette: FKs and user+created_at index added; slot_index range and non-negative weight checks added. "Exactly 6 slots" and weight sum > 0 enforced in service with tests.
- Dice: FKs and index added. Dice value range enforced in service/tests; unlimited when max_daily_plays=0 documented.
- Lottery: FKs, index, and non-negative checks added. Active prize weight sum > 0 and stock coherence enforced in service/tests; unlimited when max_daily_tickets=0 documented.
- Ranking: FK to user added with SET NULL; matches doc intent.
- Feature schedule: season_id and is_locked removed to match spec; ensure any code paths still compiling after field removal. today-feature 스케줄 게이트는 폐기.
- Migrations: Alembic env cleaned; version 20241206_0001_initial_schema creates tables via Base.metadata. Local sqlite applied; stage/prod pending `alembic upgrade head` with provided DATABASE_URL. Tests still use create_all + StaticPool.
- API contract drift: daily limit columns remain in schema but default to 0 (unlimited) and are documented. today-feature 엔드포인트는 폐기(404/410)로 계약 대상 아님. Error catalog sync pending.

## 5. Required Actions
1) Run migrations: provide stage/prod DATABASE_URL secrets and execute `alembic upgrade head`; verify `alembic_version` = `20241206_0001`.
2) Error catalog sync: document unlimited-limit semantics, lock failures, config errors. today-feature payload 문구는 폐기 처리.
3) Code/flow check: confirm no remaining references to removed feature_schedule.season_id / is_locked; today-feature 스케줄/feature_type=NONE 분기 삭제.
4) Admin/QA checklists: keep pre-flight validations (roulette slot count/weight sum; lottery active prize weight sum; season-pass level monotonicity) and ensure FE shows remaining=0 as "unlimited" while sentinel is active.

## 6. Verification Steps (per deploy)
- `alembic upgrade head` succeeds on target DB.
- `SELECT COUNT(*) FROM alembic_version` returns 1 row with 20241206_0001.
- Smoke queries return rows/structure: `DESCRIBE user_event_log`, `DESCRIBE roulette_segment`, `DESCRIBE season_pass_progress`.
- Admin-config validations pass: roulette has 6 slots (0-5) with weight sum > 0; lottery has at least one active prize with weight sum > 0; season_pass_level levels unique and increasing.
- API smoke: roulette/dice/lottery play endpoints write logs with FKs intact; season-pass stamp adds log and progress rows. today-feature 엔드포인트는 폐기.

## 7. Updates (2025-12-25)
- today-feature 기능 폐기 반영(404/410), 관련 스케줄/payload 검증 제외.
- version bump v1.1.

## 7. Updates (2025-12-06)
- season_pass_stamp_log / reward_log now link to season_pass_progress via progress_id; pytest suite green with added integration tests (roulette/dice/lottery play, season-pass edge cases, admin ranking upload).
- Alembic migration applied locally (sqlite) and verified `20241206_0001`; stage/prod still pending.
- Service-level validations for roulette/lottery/dice cross-row rules implemented and covered by tests; feature_schedule admin no longer touches removed `season_id` field.
