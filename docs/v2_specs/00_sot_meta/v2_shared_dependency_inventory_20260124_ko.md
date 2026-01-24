문서 타입: 인벤토리/리포트
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상: BE/FE/운영
상태: Draft

# V2 공용 의존 목록 (Shared Dependency Inventory)

## 1. 목적 (Purpose)
V2 코드가 `app/` 공용 모델/서비스/코어에 의존하는 항목을 정리해, 분리/삭제 우선순위를 명확히 한다.

## 2. 범위 (Scope)
- 대상 경로: `app/v2/**/*.py`
- 기준: `from app.` 또는 `import app.` 의존

## 3. SoT 우선순위 (References)
- 문서 규칙: docs/v2_specs/00_sot_meta/01_V2_DOCUMENTATION_RULES.md
- 통합 기준: docs/v2_specs/08_changelog/통합/v2_fullstack_integration_ground_sot_ko.md

## 4. 공용 의존 카테고리별 목록
### 4.1 Core/Config/Security
- app.core.config
- app.core.exceptions
- app.core.security

### 4.2 DB Base
- app.db.base_class

### 4.3 공용 Models (app/models)
- app.models.admin_audit_log
- app.models.admin_message
- app.models.admin_user_profile
- app.models.app_ui_config
- app.models.event
- app.models.external_ranking
- app.models.external_ranking_daily_deposit_delta
- app.models.feature
- app.models.game_wallet
- app.models.game_wallet_ledger
- app.models.idempotency
- app.models.inventory
- app.models.mission
- app.models.ops_eval_metric
- app.models.ops_log
- app.models.ops_plan
- app.models.ops_target
- app.models.season_pass
- app.models.survey
- app.models.team_battle
- app.models.trial_token_bucket
- app.models.user
- app.models.user_activity
- app.models.user_cash_ledger
- app.models.user_retention_state
- app.models.user_segment
- app.models.v2_level_reward
- app.models.vault_earn_event
- app.models.vault_withdrawal_request
- app.models.vault2

### 4.4 공용 Schemas (app/schemas)
- app.schemas.admin_streak_rewards
- app.schemas.admin_user
- app.schemas.admin_user_summary
- app.schemas.base
- app.schemas.cc_deposit
- app.schemas.dice
- app.schemas.event
- app.schemas.lottery
- app.schemas.mission
- app.schemas.ops_plan
- app.schemas.ops_target
- app.schemas.roulette
- app.schemas.survey

### 4.5 V1 라우트 브릿지
- app.api.routes.activity
- app.api.routes.auth
- app.api.routes.new_user_onboarding
- app.api.routes.telegram

### 4.6 V1 서비스 브릿지/의존
- app.services.game_common

## 5. 리스크/영향
- `app/` 공용 모델/스키마/코어 삭제 시 v2 런타임 즉시 실패 가능.
- 공용 의존 제거는 모델/스키마의 v2 전용 이관 및 라우터/서비스 교체가 선행되어야 함.

## 6. 다음 단계 (권장)
- 1차 우선순위: V1 라우트 브릿지 제거 (v2 전용 라우터로 대체)
- 2차 우선순위: 공용 스키마/모델의 v2 전용 이관
- 3차 우선순위: 공용 서비스/코어 의존 최소화

## 7. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성

src\api\surveyApi.ts 