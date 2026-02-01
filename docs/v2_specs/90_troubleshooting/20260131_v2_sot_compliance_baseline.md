# V2 SOT Compliance Baseline (2026-01-31)

This document lists the files in V2 that are still importing V1 models (`app.models.*`). This serves as a baseline for future refactoring to achieve full SOT compliance.

## Violations Found

### Admin API
- `app.v2.api.admin_ops_plan`
- `app.v2.api.admin.analytics_routes`
- `app.v2.api.admin.game_config_routes`
- `app.v2.api.admin.level_routes`
- `app.v2.api.admin.marketing_routes`
- `app.v2.api.admin.mission_routes`
- `app.v2.api.admin.ops_routes`
- `app.v2.api.admin.streak_routes`
- `app.v2.api.admin.user_routes`

### Public API
- `app.v2.api.events`
- `app.v2.api.routes`
- `app.v2.schemas.v2_admin_feature_schedule`
- `app.v2.schemas.v2_dice`
- `app.v2.schemas.v2_lottery`
- `app.v2.schemas.v2_ranking`
- `app.v2.schemas.v2_roulette`

### Services
- `app.v2.services.admin_economy_service`
- `app.v2.services.admin_inventory_service`
- `app.v2.services.admin_user_service`
- `app.v2.services.daily_nudge_service`
- `app.v2.services.event_service`
- `app.v2.services.idempotency_service`
- `app.v2.services.inventory_service`
- `app.v2.services.mission_service`
- `app.v2.services.ops_log_service`
- `app.v2.services.retention_intervention_service`
- `app.v2.services.roi_analysis_service`
- `app.v2.services.streak_service`
- `app.v2.services.survey_reward_service`
- `app.v2.services.survey_service`
- `app.v2.services.team_battle_admin_service`
- `app.v2.services.team_battle_service`
- `app.v2.services.ui_config_service`
- `app.v2.services.v2_admin_mission_service`
- `app.v2.services.v2_admin_ops_log_service`
- `app.v2.services.v2_admin_ops_plan_service`
- `app.v2.services.v2_dice_game_service`
- `app.v2.services.v2_lottery_game_service`
- `app.v2.services.v2_roulette_game_service`
- `app.v2.services.vault2_service`
- `app.v2.services.vault_service`

## Next Steps
1. Create `v2_` equivalent models for frequently used legacy models (`feature`, `mission`, `inventory`, `vault_withdrawal_request`).
2. Update services to import from `app.v2.models`.
3. Use `tests/v2/verification/test_v2_sot_compliance.py` to prevent regressions.
