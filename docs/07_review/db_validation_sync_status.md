# DB Validation for Frontend-Backend Sync

- Document type: Review/Status
- Version: v1.0
- Date: 2025-12-06
- Author: Backend review
- Audience: Backend/Frontend leads, QA

## 1. Purpose
Evaluate how well current database schema and validation support consistent frontend-backend API behavior and today-feature flows.

## 2. Scope
- DB schema vs. docs/04_db and module specs
- API <> DB alignment for roulette/dice/lottery/ranking/season-pass and feature schedule
- Migration readiness and operational checks

## 3. Status Snapshot
- Schema coverage: OK (tables/models aligned with docs after recent updates)
- Constraints/indexes: Partial (per-row FK/indexes added; cross-row sum checks still needed in services)
- Migrations: Risk (initial Alembic revision present but not yet applied; uses create_all)
- API sync: Partial (daily-limit fields now default 0/unlimited; API contracts must reflect this)

## 4. Findings (by area)
- Core tables: user, feature_schedule, feature_config now match doc fields; config_json now JSON. user_event_log added with indexes.
- Season pass: Constraints (unique, FK) match docs; auto_claim is boolean; CASCADE FKs present (docs were silent) and acceptable. Service logic still must enforce stamp/day and level-up per docs.
- Roulette: FKs and user+created_at index added; slot_index range and non-negative weight checks added. No DB-level enforcement of "exactly 6 slots" or weight sum > 0; must be validated in services/admin.
- Dice: FKs and index added. No DB-level validation for dice value ranges (1-6); service must enforce.
- Lottery: FKs, index, and non-negative checks added. No DB-level weight-sum > 0 or active-stock consistency; service/admin must enforce.
- Ranking: FK to user added with SET NULL; matches doc intent.
- Feature schedule: season_id and is_locked removed to match spec; ensure any code paths still compiling after field removal.
- Migrations: Alembic env cleaned; version 20241206_0001_initial_schema creates tables via Base.metadata. Database remains unapplied until `alembic upgrade head` runs with a valid DATABASE_URL.
- API contract drift: daily limit columns remain in schema but default to 0 (unlimited). Frontend/backend docs and responses should clarify this new behavior or reintroduce limits if required.

## 5. Required Actions
1) Run migrations: set DATABASE_URL and execute `alembic upgrade head` (dev/stage/prod) before API use.
2) Service-level validation: enforce roulette 6 slots and weight sum > 0; lottery weight sum > 0 and active-stock coherence; dice roll range 1-6; today-feature gating per schedule.
3) Code cleanup: remove or refactor any usages of feature_schedule.season_id / is_locked that were dropped.
4) Contract alignment: update API docs/responses to note daily limit = unlimited (0) unless product wants limits back; if limits needed, set defaults in config rows and validate.
5) Admin/QA checklists: add pre-flight validations for roulette/lottery configs (slot count, weight sum, active prizes) and season-pass level monotonicity before enabling features.

## 6. Verification Steps (per deploy)
- `alembic upgrade head` succeeds on target DB.
- `SELECT COUNT(*) FROM alembic_version` returns 1 row with 20241206_0001.
- Smoke queries return rows/structure: `DESCRIBE user_event_log`, `DESCRIBE roulette_segment`, `DESCRIBE season_pass_progress`.
- Admin-config validations pass: roulette has 6 slots (0-5) with weight sum > 0; lottery has at least one active prize with weight sum > 0; season_pass_level levels unique and increasing.
- API smoke: today-feature/status matches feature_schedule; roulette/dice/lottery play endpoints write logs with FKs intact; season-pass stamp adds log and progress rows.

## 7. Updates (2025-12-06)
- Admin validation tightened: roulette now enforces exactly 6 unique slots (0-5) with non-negative weights and total weight > 0; lottery requires non-negative weight/stock and at least one active prize with positive weight; dice allows 0 to represent unlimited daily plays.
- Runtime guards: roulette and lottery services reject negative weights; feature_schedule admin no longer touches removed `season_id` field.
