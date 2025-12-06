# Backend Pending Actions
- Document type: Action items
- Date: 2025-12-06

## Must-do
- Run Alembic: set `DATABASE_URL` then `alembic upgrade head` (expect version 20241206_0001).
- Update API docs to state daily limits are unlimited (max_daily=0) for roulette/dice/lottery until limits return.
- Auth/token: issuance endpoint added (`/api/auth/token`), JWT decoding dependency added; ensure clients send Bearer token; update CORS accordingly.

## Concurrency
- Lottery stock: FOR UPDATE applied where supported; still add retries/error handling for lock timeouts in prod DB.
- Roulette spin: consider SELECT ... FOR UPDATE on config/segments if multi-config future; currently single active config but add guard.
- Event logging: currently autocommit per play; if wrapped in outer txn, ensure log writes don’t conflict.

## Season Pass
- Verify service flow vs doc: one stamp per day, XP calc, multi-level-up rewards, manual claim path; add tests. (Tests seeded; expand coverage.)
- Decide if stamp hook should skip when feature_type=NONE (currently skips only on exceptions).

## Testing
- Add unit/integration tests for roulette/dice/lottery reward delivery, event logging, season-pass stamp hook, and schedule gating errors.
