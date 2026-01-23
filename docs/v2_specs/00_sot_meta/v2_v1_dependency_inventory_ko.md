문서 타입: 가이드
버전: v1.2
작성일: 2026-01-23
작성자: GitHub Copilot
대상: V2 마이그레이션 작업자
상태: Draft

## 1. 목적
V2 코드베이스에서 V1 서비스/라우트/모델 경유 지점을 정리하여, v2-only 전환 시 이관 범위를 명확히 한다.

## 2. 범위
- Backend: app/v2/**
- V2에서 V1 서비스/라우트 경유 지점
- V2 서비스 목록 (app/v2/services/*)

## 3. 조사 기준
- app/v2/** 내 `from app.services...` 및 `from app.api.routes...` 참조를 기준으로 목록화
- alias 라우트로 V1 라우트를 직접 호출하는 지점 포함

## 4. V2 → V1 라우트/서비스 경유 목록
### 4.1 V2 API 라우트에서 V1 라우트 직접 호출
- app/v2/api/v1_auth_user_alias.py
  - app.api.routes.auth (v1_auth)
  - app.api.routes.activity (v1_activity)
  - app.api.routes.new_user_onboarding (v1_new_user)
  - app.api.routes.telegram (v1_telegram)

### 4.2 V2 API 라우트에서 V1 서비스 호출
- app/v2/api/routes.py
  - app.services.feature_service.FeatureService
  - app.services.inventory_service.InventoryService
  - app.services.shop_service.ShopService
  - app.services.team_battle_service.TeamBattleService
  - app.services.game_wallet_service.GameWalletService
  - app.services.dice_service.DiceService
  - app.services.lottery_service.LotteryService
  - app.services.roulette_service.RouletteService
  - app.services.ui_config_service.UiConfigService
  - app.services.idempotency_service.IdempotencyService
  - app.services.survey_service.SurveyService
- app/v2/api/events.py
  - app.services.event_service.EventService
- app/v2/api/admin/game_config_routes.py
  - app.services.admin_audit_service.AdminAuditService
- app/v2/api/admin/inventory_routes.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.game_wallet`, `app.models.inventory`, `app.models.user`
- app/v2/api/admin_cc_deposit.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.user`
- app/v2/api/admin_ops_plan.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.ops_plan`, `app.models.ops_target`
- app/v2/api/admin/inventory_routes.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.game_wallet`, `app.models.inventory`, `app.models.user`
- app/v2/api/admin/economy_routes.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.game_wallet`, `app.models.inventory`, `app.models.user`
- app/v2/api/admin/level_routes.py
  - (Migrated to V2 Services) V1 Model Usage: Shared Models
- app/v2/api/admin/user_routes.py
  - (Migrated to V2 Services) V1 Model Usage: `app.models.user`, `app.models.game_wallet`
- app/v2/api/admin/segment_routes.py
  - (Migrated to V2 Services) V1 Model Usage: None (Clean)
- app/v2/api/admin/vault_routes.py
  - app.v2.services.vault_service.V2VaultService
  - app.v2.services.admin_economy_service.V2AdminEconomyService

## 5. V2 서비스에서 V1 서비스 경유
- app/v2/services/mission_service.py
  - app.services.ui_config_service.UiConfigService
- app/v2/services/retention_intervention_service.py
  - app.services.ops_log_service.OpsLogService
  - app.services.reward_scheduler.RewardScheduler
- app/v2/services/segment_service.py
  - app.services.segment_rules_engine (SegmentContext, matches_condition)
- app/v2/services/vault2_service.py
  - app.services.audit_service.AuditService
  - app.models.user_cash_ledger.UserCashLedger (v1 모델 의존)
- app/v2/services/admin_cc_deposit_service.py
  - app.v2.services.vault_service.V2VaultService
  - app.services.season_pass_service.SeasonPassService
  - app.services.level_xp_service.LevelXPService

## 6. V2 서비스 목록 (app/v2/services)
- admin_cc_deposit_service.py
- admin_message_service.py
- csv_import_service.py
- csv_to_redis_service.py
- game_config_service.py
- golden_event_service.py
- golden_intervention_service.py
- inventory_service.py
- mission_service.py
- retention_intervention_service.py
- segment_service.py
- shop_service.py
- ticket_zero_service.py
- vault2_service.py
- vault_service.py

## 7. 후속 이관 메모
- v2-only 전환 시 위 4~5절 전수 제거/대체가 필요
- 인증/유저 SoT 전환 시 `get_current_user_id`와 v2_user 동기화가 선행되어야 함

## 8. V1 네임스페이스/서비스 호출 목록 (CSV)
id | route | HTTP | v1_service | v2_service | status | owner | risk | tests | migrate_steps | notes
001 | /api/v2/auth/token | POST | app.api.routes.auth.issue_token | app.v2.api.auth_routes.v2_issue_token | mixed | backend | High | none | 1) v2 auth 완성 2) v1 alias 제거 | v1 auth 토큰 로직 대체 진행 중
002 | /api/v2/auth/login | POST | app.api.routes.auth.issue_token | app.v2.api.auth_routes.v2_login | mixed | backend | High | none | 1) v2 auth 완성 2) v1 alias 제거 | v1 login alias 제거 필요
003 | /api/v2/user/me | GET | app.api.routes.auth.issue_token | app.v2.api.user_routes.v2_user_me | mixed | backend | Medium | none | v2 user/me 완성 후 v1 alias 제거 | v1_auth_user_alias 중복 경로 존재
004 | /api/v2/user/balance | GET | - | app.v2.api.user_routes.v2_user_balance | v2-only | backend | Low | pytest | v2 balance 완성 | 이관 완료
005 | /api/v2/vault/status | GET | - | app.v2.api.vault_routes.get_v2_vault_status | v2-only | backend | Low | pytest | v2 vault 전용 서비스 교체 | 이관 완료
006 | /api/v2/vault/withdraw | POST | - | app.v2.api.vault_routes.v2_withdraw | v2-only | backend | Low | pytest | v2 withdraw 전용 서비스 교체 | 이관 완료
007 | /api/v2/activity/ingest | POST | app.api.routes.activity.record_activity | app.v2.api.activity_routes.ingest_activity | mixed | backend | Medium | none | v2 이벤트 저장 구현 | 현재 mock 응답
008 | /api/v2/roulette/status | GET | app.services.roulette_service.RouletteService | app.v2.api.routes.roulette_status | v2-only | backend | Medium | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 서비스 사용
009 | /api/v2/roulette/play | POST | app.services.roulette_service.RouletteService | app.v2.api.routes.roulette_play | v2-only | backend | High | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 서비스 사용, 라우트 내 v1 인스턴스 제거
010 | /api/v2/dice/status | GET | app.services.dice_service.DiceService | app.v2.api.routes.dice_status | v2-only | backend | Medium | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 서비스 사용
011 | /api/v2/dice/play | POST | app.services.dice_service.DiceService | app.v2.api.routes.dice_play | v2-only | backend | High | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 service 사용, 라우트 내 v1 인스턴스 제거
012 | /api/v2/lottery/status | GET | app.services.lottery_service.LotteryService | app.v2.api.routes.lottery_status | v2-only | backend | Medium | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 서비스 사용
013 | /api/v2/lottery/play | POST | app.services.lottery_service.LotteryService | app.v2.api.routes.lottery_play | v2-only | backend | High | tests/v2_tests/phase3_game/test_game_engine_smoke.py | v2 전용 서비스로 분리 | v2 service 사용, 라우트 내 v1 인스턴스 제거
014 | /api/v2/inventory | GET | app.services.inventory_service.InventoryService | app.v2.api.routes.get_inventory | mixed | backend | High | none | v2 인벤토리 SoT 전환 | 재화/아이템 조회
015 | /api/v2/inventory/use | POST | app.services.inventory_service.InventoryService | app.v2.api.routes.use_inventory_item | mixed | backend | High | none | v2 인벤토리 SoT 전환 | 데이터 쓰기
016 | /api/v2/shop/products | GET | app.services.ui_config_service.UiConfigService | app.v2.api.routes.list_shop_products | mixed | backend | Medium | none | v2 config 분리 | v1 서비스 호출
017 | /api/v2/shop/purchase | POST | app.services.idempotency_service.IdempotencyService | app.v2.api.routes.purchase_shop_product | mixed | backend | High | none | v2 idempotency/ledger 통합 | 결제/차감
018 | /api/v2/team-battle/* | GET/POST | app.services.team_battle_service.TeamBattleService | app.v2.api.routes.* | mixed | backend | Medium | none | v2 전용 서비스로 분리 | 팀배틀 코어
019 | /api/v2/surveys/* | GET/POST/PATCH | app.services.survey_service.SurveyService | app.v2.api.routes.* | mixed | backend | Medium | none | v2 전용 설문 서비스 분리 | 설문 응답
020 | /api/v2/events/status | GET | app.services.event_service.EventService | app.v2.api.events.get_event_status | mixed | backend | Medium | none | v2 이벤트 서비스로 이관 | /api/events 경로 공유
021 | /api/v2/admin/game/* | GET/PUT/POST/DELETE | app.services.admin_audit_service.AdminAuditService | app.v2.api.admin.game_config_routes.* | mixed | backend | Low | none | v2 어드민 감사로 분리 | 어드민 전용
022 | /api/v2/admin/inventory/* | GET/POST/PUT/DELETE | app.services.inventory_service.InventoryService | app.v2.api.admin.inventory_routes.* | mixed | backend | Medium | none | v2 인벤토리 어드민 분리 | 데이터 쓰기 포함
023 | /api/v2/admin/economy/* | GET/POST/PUT/DELETE | app.services.game_wallet_service.GameWalletService | app.v2.api.admin.economy_routes.* | mixed | backend | High | none | v2 경제 어드민 분리 | 재화 쓰기 포함
024 | /api/v2/admin/users/* | GET/POST | app.services.admin_user_service.AdminUserService | app.v2.api.admin.user_routes.* | mixed | backend | Medium | none | v2 유저 어드민 분리 | 유저 생성/조정
025 | /api/v2/admin/segments/* | GET/POST/PUT/DELETE | app.services.user_segment_service.UserSegmentService | app.v2.api.admin.segment_routes.* | mixed | backend | Medium | none | v2 세그먼트 분리 | 룰/배치

## 9. 라우팅 맵 (v1/v2 태그)
id | route | HTTP | v1_service | v2_service | status | owner | risk | tests | migrate_steps | notes
101 | /api/auth/token | POST | app.api.routes.auth.issue_token | - | v1 | backend | High | none | v2 완성 후 폐기 | 인증 핵심
102 | /api/v2/auth/token | POST | - | app.v2.api.auth_routes.v2_issue_token | v2 | backend | High | none | v2 유지 | 인증 핵심
103 | /api/v2/auth/login | POST | - | app.v2.api.auth_routes.v2_login | v2 | backend | High | none | v2 유지 | 인증 alias
104 | /api/v2/user/me | GET | - | app.v2.api.user_routes.v2_user_me | v2 | backend | Medium | none | v2 유지 | 유저 조회
105 | /api/v2/user/balance | GET | - | app.v2.api.user_routes.v2_user_balance | v2-only | backend | Low | pytest | 유지 | 금고 잔석
106 | /api/v2/dev/login | POST | - | app.v2.api.dev_login.dev_login | v2 | backend | Medium | none | dev only | 개발용 로그인
107 | /api/events/status | GET | app.api.routes.events.get_event_status | app.v2.api.events.get_event_status | mixed | backend | Medium | none | 단일 경로로 정리 | v1/v2 동일 경로 사용
108 | /api/v2/vault/status | GET | - | app.v2.api.vault_routes.get_v2_vault_status | v2-only | backend | Low | pytest | v2 전용으로 교체 | 이관 완료
109 | /api/v2/vault/withdraw | POST | - | app.v2.api.vault_routes.v2_withdraw | v2-only | backend | Low | pytest | v2 전용으로 교체 | 이관 완료
110 | /api/v2/roulette/status | GET | app.services.roulette_service.RouletteService | app.v2.api.routes.roulette_status | mixed | backend | Medium | none | v2 서비스 분리 | 게임 조회
111 | /api/v2/roulette/play | POST | app.services.roulette_service.RouletteService | app.v2.api.routes.roulette_play | mixed | backend | High | none | v2 서비스 분리 | 게임 실행
112 | /api/v2/dice/status | GET | app.services.dice_service.DiceService | app.v2.api.routes.dice_status | mixed | backend | Medium | none | v2 서비스 분리 | 게임 조회
113 | /api/v2/dice/play | POST | app.services.dice_service.DiceService | app.v2.api.routes.dice_play | mixed | backend | High | none | v2 서비스 분리 | 게임 실행
114 | /api/v2/lottery/status | GET | app.services.lottery_service.LotteryService | app.v2.api.routes.lottery_status | mixed | backend | Medium | none | v2 서비스 분리 | 게임 조회
115 | /api/v2/lottery/play | POST | app.services.lottery_service.LotteryService | app.v2.api.routes.lottery_play | mixed | backend | High | none | v2 서비스 분리 | 게임 실행
116 | /api/v2/inventory | GET | app.services.inventory_service.InventoryService | app.v2.api.routes.get_inventory | mixed | backend | High | none | v2 전용으로 교체 | 인벤토리 SoT
117 | /api/v2/inventory/use | POST | app.services.inventory_service.InventoryService | app.v2.api.routes.use_inventory_item | mixed | backend | High | none | v2 전용으로 교체 | 인벤토리 SoT
118 | /api/v2/shop/products | GET | app.services.ui_config_service.UiConfigService | app.v2.api.routes.list_shop_products | mixed | backend | Medium | none | v2 전용으로 교체 | 상점 목록
119 | /api/v2/shop/purchase | POST | app.services.idempotency_service.IdempotencyService | app.v2.api.routes.purchase_shop_product | mixed | backend | High | none | v2 전용으로 교체 | 결제/차감

## 10. 경로 충돌 목록 및 권장 해결
| route | v1 처리 | v2 처리 | 상태 | 권장 해결 |
|---|---|---|---|---|
| /api/events/status | app.api.routes.events.get_event_status | app.v2.api.events.get_event_status | mixed | v2 전용 경로로 이동하거나 v1 라우트 제거 |

## 11. 구체적 발견(예시)
- app/v2/api/routes.py: v1 서비스 다수 직접 호출
  - [app/v2/api/routes.py](app/v2/api/routes.py#L23-L32)
- app/v2/api/admin_cc_deposit.py: v1 서비스 호출
  - [app/v2/api/admin_cc_deposit.py](app/v2/api/admin_cc_deposit.py#L16-L17)
- app/v2/api/admin_ops_plan.py: v1 서비스 호출
  - [app/v2/api/admin_ops_plan.py](app/v2/api/admin_ops_plan.py#L34)
- app/v2/api/admin/inventory_routes.py: v1 모델/서비스 참조
  - [app/v2/api/admin/inventory_routes.py](app/v2/api/admin/inventory_routes.py#L14)
  - [app/v2/api/admin/inventory_routes.py](app/v2/api/admin/inventory_routes.py#L22-L24)
- app/v2/api/admin/economy_routes.py: v1 모델/서비스 참조
  - [app/v2/api/admin/economy_routes.py](app/v2/api/admin/economy_routes.py#L13)
  - [app/v2/api/admin/economy_routes.py](app/v2/api/admin/economy_routes.py#L34-L38)

## 12. 아직 v1 경로에 남아있는 핵심 엔드포인트
- /api/retention/intervention/resolve
  - [app/api/routes/retention_intervention.py](app/api/routes/retention_intervention.py#L17-L28)
- /api/retention/reengagement/queue
  - [app/api/routes/retention_intervention.py](app/api/routes/retention_intervention.py#L30-L41)

## 13. 우선 순위(권장)
- High: 인증(Auth), 금고(Vault) 읽기/쓰기, 결제/구매(Shop Purchase), 게임 Play(roulette/dice/lottery), 인벤토리 사용(쓰기)
- Medium: 상태조회(read-only), 팀배틀, 설문
- Low: 어드민 전용/저트래픽 경로

## 14. 제안하는 다음 행동
- 문서 보강: v2_v1_dependency_inventory_ko.md에 파일 레벨 증거(파일명:라인) 유지/확장
- 소유권/ETA 지정: mixed 항목에 owner + 우선순위 + 작업 방식(Migrate/Shim/Keep) 추가
- 자동 스캔 스크립트: scripts에 v2↔v1 의존 스캐너 추가 (PR 리포트용)
- 작은 PR 진행: Top10(High) 엔드포인트부터 Plan → Patch → Verify → Ship

### 2026-01-23 정리 노트
- 핵심 테스트(아키텍처 SOT / 게임 스모크 / 상점·인벤토리 / 미션) 로컬 실행 및 통과 확인(출력 스니펫은 `docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260123.md` 참조).

버전: v1.4 (2026-01-23, GitHub Copilot): 문서에 검증 로그 스니펫 링크 추가 및 최종 정리 노트 반영

## 15. 변경 이력
- v1.4 (2026-01-23, GitHub Copilot): Game Play 라우트(`/roulette/play`, `/dice/play`, `/lottery/play`)를 V2 게임 서비스로 정리 및 라우트 내 V1 인스턴스 제거; 검증 테스트 통과
- v1.3 (2026-01-24, Antigravity): Admin CC Deposit Service V2 이관 완료 (V1 VaultShim 제거, V2VaultService.handle_deposit_increase_signal 사용)
- v1.3 (2026-01-23, Antigravity): Vault 및 CC Deposit 영역 v2-only 이관 및 V1 서비스 의존 제거 반영
- v1.2 (2026-01-23, GitHub Copilot): V2 MissionService의 V1 RewardService 의존 제거 반영
- v1.1 (2026-01-23, GitHub Copilot): v1 호출 CSV, 라우팅 맵, 경로 충돌/예시/우선순위 섹션 추가
- v1.0 (2026-01-23, GitHub Copilot): v2 → v1 경유 범위 및 v2 서비스 목록 초안 작성
