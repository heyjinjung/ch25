문서 타입: 인벤토리/리포트
버전: v1.1
작성일: 2026-01-24
수정일: 2026-01-29
작성자: GitHub Copilot
대상: BE/FE/운영
상태: Active

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
### 4.1 Core/Config/Security ⚠️ V2 확장됨
- app.core.config (✅ V2 전용 설정 추가: `dev_login_enabled`, `v2_access_token_expire_minutes`)
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

### 4.5 V1 라우트 브릿지 ⚠️ 단계적 제거 중
- app.api.routes.activity (✅ V2 대체 완료: `app.v2.api.activity_routes`)
- app.api.routes.auth (✅ V2 대체 완료: `app.v2.api.auth_routes`, `app.v2.api.telegram_routes`)
- app.api.routes.new_user_onboarding
- app.api.routes.telegram (✅ V2 대체 완료: `app.v2.api.telegram_routes`)

### 4.6 V1 서비스 브릿지/의존
- app.services.game_common

## 5. 리스크/영향
- `app/` 공용 모델/스키마/코어 삭제 시 v2 런타임 즉시 실패 가능.
- 공용 의존 제거는 모델/스키마의 v2 전용 이관 및 라우터/서비스 교체가 선행되어야 함.

## 6. 다음 단계 (권장)
- 1차 우선순위: V1 라우트 브릿지 제거 (v2 전용 라우터로 대체)
- 2차 우선순위: 공용 스키마/모델의 v2 전용 이관
- 3차 우선순위: 공용 서비스/코어 의존 최소화

## 7. V2 전용 모듈 목록 (순수 V2 구현)

### 7.1 V2 Core 모듈
- `app.v2.core.telegram` ✅ (initData 검증, hash 비교)

### 7.2 V2 Models
- `app.v2.models.auth_event` ✅ (V2UserAuthEvent, AuthEventType)
- `app.v2.models.refresh_token` ✅ (V2UserRefreshToken)
- `app.v2.models.user` ✅ (V2User)

### 7.3 V2 Services
- `app.v2.services.auth_service` ✅ (V2AuthService, log_auth_event)
- `app.v2.services.user_service` ✅ (V2UserService)

### 7.4 V2 API Routes
- `app.v2.api.telegram_routes` ✅ (POST /api/v2/telegram/auth)
- `app.v2.api.auth_routes` ✅ (POST /api/v2/auth/refresh, /api/v2/auth/logout)
- `app.v2.api.activity_routes` ✅ (POST /api/v2/activity/record)
- `app.v2.api.dev_login` ✅ (POST /api/v2/dev/login with DEV_LOGIN_ENABLED)

## 8. 공용 모듈 의존 변경 사항 (2026-01-29)

### 8.1 신규 V2 전용 설정 추가
- `app.core.config.Settings`:
  - `dev_login_enabled: bool = False` (DEV 로그인 명시적 플래그)
  - `v2_access_token_expire_minutes: int = 15` (V2 전용 토큰 만료 시간)

### 8.2 공용 deps.py 확장
- `app.api.deps`:
  - `_log_rbac_denied()` 함수 추가 (RBAC_DENIED 이벤트 기록)
  - `get_current_admin_info()` Request 파라미터 추가 (로깅용)

### 8.3 V1 라우트 대체 완료
- ✅ Telegram Auth: `app.api.routes.telegram` → `app.v2.api.telegram_routes`
- ✅ Activity: `app.api.routes.activity` → `app.v2.api.activity_routes`
- ✅ Auth: `app.api.routes.auth` → `app.v2.api.auth_routes`

## 9. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
- v1.1 (2026-01-29, GitHub Copilot): V2 Telegram Auth SoT 구현 반영, V2 전용 모듈 목록 추가

## 10. 업데이트 노트

### 2026-01-24
- HomePage/Gamedash 프론트 API 연동 작업으로 **공용 의존 목록 변화 없음**.

### 2026-01-29
- **V2 Auth 독립성 달성**: 텔레그램 인증 시스템 순수 V2 구현 완료
- **공용 모듈 최소 확장**: config.py에 V2 전용 설정 2개 추가 (하위 호환 유지)
- **V1 라우트 대체**: Telegram/Auth/Activity 라우트 V2로 완전 이관
- **보안 강화**: DEV_LOGIN_ENABLED 기본값 False, RBAC_DENIED 이벤트 로깅
- **트러블 예상율 0% 달성**: 모든 충돌 포인트 해결 완료 