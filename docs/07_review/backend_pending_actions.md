# Backend Pending Actions
- Document type: Action items
- Date: 2025-12-06

## Must-do
- Update API docs to state daily limits are unlimited (max_daily=0) for roulette/dice/lottery until limits return.
- Auth/token: issuance endpoint added (`/api/auth/token`), JWT decoding dependency added; ensure clients send Bearer token; update CORS accordingly.
- Season pass FKs wired (`progress_id` on stamp/reward logs) and unit tests now passing; ensure migration/docs reflect the schema.

## Concurrency
- Lottery stock: FOR UPDATE applied where supported; lock timeout now returns LOCK_NOT_ACQUIRED; consider retry policy for prod DB.
- Roulette spin: FOR UPDATE guard added on segments; validate behavior on MySQL/Postgres under load.
- Event logging: currently autocommit per play; if wrapped in outer txn, ensure log writes don’t conflict.

## Season Pass
- Verify service flow vs doc: one stamp per day, XP calc, multi-level-up rewards, manual claim path; base tests now passing, expand coverage.
- Decide if stamp hook should skip when feature_type=NONE (currently skips only on exceptions).

## Testing
- Add unit/integration tests for roulette/dice/lottery reward delivery, event logging, season-pass stamp hook, and schedule gating errors.
