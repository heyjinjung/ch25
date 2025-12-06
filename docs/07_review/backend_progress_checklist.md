# Backend Progress Checklist
- Document type: Checklist/Status
- Version: v1.0
- Date: 2025-12-06
- Audience: Backend/QA/PM

## DB & Migrations
- [ ] `alembic upgrade head` executed on target DB (check `alembic_version` = 20241206_0001).
- [x] Tables/models aligned to docs/04_db (user/feature/season_pass/roulette/dice/lottery/ranking/user_event_log).
- [x] FKs and key indexes present (logs indexed on user_id+created_at; configs linked).
- [x] Admin/runtime validations cover cross-row rules: roulette 6 slots & weight sum >0; lottery active prize weight sum >0; dice negative weight/stock blocked; dice roll range enforced in service.

## Feature Gating / Schedule
- [x] Today-feature gating enforced via `FeatureService` with KST normalization.
- [x] Admin schedule upsert uses unique date; removed obsolete `season_id`.
- [ ] API docs updated to reflect schedule rules and errors (NoFeatureToday/InvalidSchedule).

## Game Modules
- Roulette: [x] segments ordered/6-count check; [x] rewards wired to RewardService; [ ] concurrency review (spin logging/weight pool).
- Dice: [x] gameplay; [x] dice value validation (1-6 enforced); [x] rewards wired to RewardService; [ ] document unlimited daily plays (max_daily=0 sentinel).
- Lottery: [x] stock decrement; [x] rewards wired to RewardService; [x] add transactional guard for concurrent stock (FOR UPDATE when supported); [ ] document unlimited daily tickets (max_daily=0 sentinel).
- Ranking: [x] read-only snapshot; [ ] admin upload path doc/tests.

## Season Pass
- [x] Tables and uniques in place; auto_claim boolean.
- [ ] Service logic: confirm stamp/day enforcement, level-up chain, reward_log writes, XP calc per docs.
- [ ] API docs for season-pass status/stamp/reward flows.

## Auth & Security
- [ ] Auth/token issuance/verification implemented server-side.
- [ ] Dependency to inject user_id into services/endpoints.
- [ ] CORS/settings validated for FE hosts.

## Logging & Event Trail
- [x] `user_event_log` table added with indexes.
- [x] Gameplay writes user_event_log via shared helper.

## Ops & Docs
- [x] Local/Deployment guides mention Alembic upgrade.
- [ ] Error code catalog synced with current behaviors (e.g., unlimited limits, config errors).
- [ ] Tests: add/repair unit/integration for services, especially roulette/dice/lottery/season-pass.
