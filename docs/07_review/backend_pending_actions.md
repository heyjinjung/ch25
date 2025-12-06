# Backend Pending Actions
- Document type: Action items
- Date: 2025-12-06

## Must-do (open items only)
- Stage/Prod Alembic: provide `DATABASE_URL` secrets, run `alembic upgrade head`, and verify `SELECT version_num FROM alembic_version;` returns `20241206_0001`.
- Season pass hook: decide whether to skip stamp when `feature_type=NONE` (currently skips only on exceptions).

## Concurrency
- Lottery stock: FOR UPDATE + lock failure surfaced; optional retry for prod TBD.
- Roulette spin: FOR UPDATE guard present; no further action unless load test shows issues.
- Event logging: autocommit per play; acceptable unless outer txn introduced.

## Season Pass
- Flow validated against docs via tests (stamp/day enforcement, multi-level, manual claim). Remaining decision: stamp hook skip on `feature_type=NONE` (see Must-do).

## Testing
- Integration tests added for roulette/dice/lottery reward delivery + event logging; season-pass stamp reuse/manual claim/no-active-season; admin ranking upload success/conflict.
