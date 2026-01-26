# Test Results Summary (2026-01-24)

## Executed tests
- `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` — PASS (......)
- `pytest -q tests/v2_tests/phase2_core/test_vault2_service.py` — PASS
- `pytest -q tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py` — PASS
- `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` — PASS
- `pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py` — PASS
- `pytest -q tests/v2_tests/phase4_admin` — PASS (all tests in directory)

## Tests attempted but missing
- `tests/v2_tests/phase3_game/test_dice_golden_hour.py` — not found
- `tests/v2_tests/phase3_game/test_game_ledger_separation.py` — not found
- `tests/v2_tests/phase5_scenarios` — no tests found

## Notes
- Several DeprecationWarnings observed in FastAPI startup/shutdown handlers; consider addressing lifespan migration.
- Next steps: execute frontend E2E (Cypress/Playwright) and collect screenshots/NET HAR.
