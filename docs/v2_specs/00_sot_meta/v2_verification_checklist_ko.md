문서 타입: 가이드
버전: v1.19
작성일: 2026-01-23
작성자: GitHub Copilot
대상: V2 배포/검증 담당자
상태: Draft

## 1. 목적
V2 배포 전/후 필수 검증 항목을 표준화한다.

## 2. 범위
- Unit/Integration 테스트
- E2E 스모크 테스트
- 로컬/스테이징 로그 샘플 확인
- 모니터링 관찰
- 롤백 절차 문서화

## 3. 검증(VERIFY) 체크리스트
### 3.1 공통 규칙
- 각 서비스/영역별로 체크를 분리 기록한다.
- 테스트 실행 커맨드와 대상 파일을 함께 기록한다.
- 동일한 서비스라도 배포 단위가 다르면 별도 항목으로 기록한다.
- **기능 검증(Functional)**과 **아키텍처 이관(Architectural)**을 분리 기록한다.
- **v2-only 기준(Architectural)**: v2 config/log 테이블 + v2 엔진 서비스 사용 확인 + V1 import 제거가 확인되어야 “완료”로 기록한다.

### 3.2 서비스/영역별 Unit & Integration
#### 3.2.1 Auth
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)
미완료 유지 + “텔레그램 의존으로 통합 테스트 후 진행” 메모  

#### 3.2.2 Vault
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py, tests/v2_tests/phase2_core/test_vault_limit_suspension.py, tests/v2_tests/phase2_core/test_vault2_service.py)
	- 커맨드: pytest -q tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py tests/v2_tests/phase2_core/test_vault_limit_suspension.py tests/v2_tests/phase2_core/test_vault2_service.py
- [x] v2-only 기준 충족 (V1 VaultService import 제거 + V2VaultService 사용 확인)
	- 검증 실행: Antigravity 실행(2026-01-23) — 통과 (Exit Code: 0)

#### 3.2.3 Shop
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_shop_inventory_logic.py)
- [x] v2-only 기준 충족 (v2_shop_products + v2_shop_order + V2ShopService + V1 UiConfigService/IdempotencyService import 제거)
	- 검증 실행: `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` & `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` — 실행(2026-01-23) 통과 (Exit Code: 0)

#### 3.2.4 Game (roulette/dice/lottery)
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase3_game/test_game_engine_smoke.py)
- [x] v2-only import 검증 테스트 통과 (tests/v2_tests/phase1_env/test_v2_architecture_sot.py)
	- 커맨드: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py
	- 검증 실행: GitHub Copilot 실행(2026-01-23) — 통과 (Exit Code: 0)
	- 추가 조치: `V2VaultService.record_game_play_earn_event` shim 추가로 게임 엔진의 `record_game_play_earn_event` 호출을 `V2VaultService`로 안전하게 위임함 (Merge: 2026-01-23)

	- 집중 스캔(2026-01-23): Shop/Inventory/Mission/Vault은 v2 네임스페이스로 전환되었으며 관련 테스트 통과 확인(Exit Code: 0). 게임 엔진들(`v2_dice_game_service.py`, `v2_lottery_game_service.py`, `v2_roulette_game_service.py`)은 `VaultService` 의존을 `V2VaultService`로 대체 완료했고 `FeatureService` / `game_common`을 v2 no-op로 대체했습니다 (우선순위: Medium).

#### 3.2.5 Inventory
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_shop_inventory_logic.py)
- [x] v2-only 기준 충족 (v2_exchange_log + V2InventoryService + V1 모델 의존 제거)
	- 검증 실행: `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` & `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` — 실행(2026-01-23) 통과 (Exit Code: 0)

#### 3.2.6 Mission/Attendance
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_v2_mission_service.py)
	- 커맨드: pytest -q tests/v2_tests/phase2_core/test_v2_mission_service.py
- [x] v2-only 기준 충족 (V1 MissionService/RewardService import 제거 확인)
- [x] v2-only import 검증 테스트 통과 (tests/v2_tests/phase1_env/test_v2_architecture_sot.py)
	- 커맨드: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py
	- 검증 실행: GitHub Copilot 실행(2026-01-23) — 통과 (Exit Code: 0)

#### 3.2.7 Team Battle
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py)
	- 커맨드: pytest -q tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py
- [x] v2-only 기준 충족 (V1 TeamBattleService import 제거 확인)
- [x] v2-only import 검증 테스트 통과 (tests/v2_tests/phase1_env/test_v2_architecture_sot.py)
	- 커맨드: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py

#### 3.2.8 Survey/Inbox
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase5_public/test_public_routes_smoke_extended.py, tests/v2_tests/phase4_admin/test_admin_marketing_routes_smoke.py)
	- 커맨드: pytest -q tests/v2_tests/phase5_public/test_public_routes_smoke_extended.py tests/v2_tests/phase4_admin/test_admin_marketing_routes_smoke.py

#### 3.2.9 Admin (Low)
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase4_admin/*)
	- 커맨드: pytest -q tests/v2_tests/phase4_admin/test_shop_crud.py tests/v2_tests/phase4_admin/test_economy_coverage.py tests/v2_tests/phase4_admin/test_api_coverage.py tests/v2_tests/phase4_admin/test_admin_user_routes_coverage_extended.py tests/v2_tests/phase4_admin/test_admin_ops_security.py tests/v2_tests/phase4_admin/test_admin_marketing_routes_smoke.py tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py tests/v2_tests/phase4_admin/test_admin_economy_routes_coverage_extended.py

### 3.3 E2E 스모크 테스트 (핵심 플로우)
- [ ] 로그인 → 홈 진입
- [ ] 상점 조회 → 구매
- [ ] 인벤토리 조회 → 아이템 사용
- [ ] 미션 조회 → 클레임
- [x] 금고 상태 조회

### 3.4 로컬/스테이징 트래픽 샘플
- [ ] 핵심 API 요청 50~100건 샘플 수집
- [ ] 오류 로그 없음 확인
- [ ] 지연/타임아웃 징후 없음 확인

### 3.5 모니터링
- [ ] 에러율 추적 (릴리즈 후 24h)
- [ ] 응답시간 P95/P99 추적
- [ ] 핵심 엔드포인트 알람 설정 확인

### 3.6 롤백 절차 문서화
- [ ] 롤백 기준 정의(에러율, SLA)
- [ ] 롤백 커밋/이미지 태그 기록
- [ ] 롤백 실행 체크리스트 작성

### 3.7 우선순위 구현 체크리스트
- [ ] High: 인증(Auth)
- [x] High: 금고(Vault) 읽기/쓰기
- [ ] High: 결제/구매(Shop Purchase)
- [ ] High: 게임 Play(roulette/dice/lottery)
- [ ] High: 인벤토리 사용(쓰기)
- [ ] Medium: 상태조회(read-only)
- [ ] Medium: 팀배틀
- [ ] Medium: 설문
- [ ] Low: 어드민 전용/저트래픽 경로

## 4. 관련 파일 앵커
- [docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md](docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md)
- [docs/v2_specs/00_sot_meta/v2_verification_log_template_ko.md](docs/v2_specs/00_sot_meta/v2_verification_log_template_ko.md)
- [app/v2/api/auth_routes.py](app/v2/api/auth_routes.py)
- [app/v2/api/user_routes.py](app/v2/api/user_routes.py)
- [app/v2/api/vault_routes.py](app/v2/api/vault_routes.py)
- [app/v2/api/routes.py](app/v2/api/routes.py)
- [app/v2/api/deps.py](app/v2/api/deps.py)
- [app/v2/services/vault_service.py](app/v2/services/vault_service.py)
- [app/v2/services/shop_service.py](app/v2/services/shop_service.py)
- [app/v2/services/team_battle_service.py](app/v2/services/team_battle_service.py)
- [tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py](tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py)
- [tests/v2_tests/phase5_public/test_public_routes_smoke_extended.py](tests/v2_tests/phase5_public/test_public_routes_smoke_extended.py)
- [tests/v2_tests/phase4_admin/test_admin_marketing_routes_smoke.py](tests/v2_tests/phase4_admin/test_admin_marketing_routes_smoke.py)
- [app/api/routes/vault.py](app/api/routes/vault.py)
- [app/services/vault_service.py](app/services/vault_service.py)
- [app/v2/services/user_service.py](app/v2/services/user_service.py)
- [app/models/user.py](app/models/user.py)

## 5. 변경 이력
- v1.17 (2026-01-23, Antigravity): Vault 영역 v2-only 기준 충족 및 Admin 관련 서비스 이관 결과 반영
- v1.18 (2026-01-23, GitHub Copilot): Game/Shop/Inventory v2-only 검증 실행 및 통과 기록 추가 (pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py, pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py, pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py, Exit Code: 0)
- v1.17 (2026-01-23, GitHub Copilot): Shop/Inventory v2-only 검증 실행 및 통과 기록 추가 (pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py, pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py, Exit Code: 0)
- v1.16 (2026-01-23, GitHub Copilot): Mission/Attendance·Game 영역 v2-only 검증 실행 및 통과 기록 추가 (pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py, Exit Code: 0)
- v1.14 (2026-01-23, GitHub Copilot): Mission/Attendance·Team Battle v2-only import 검증 테스트 기록 추가
- v1.13 (2026-01-23, GitHub Copilot): Mission/Attendance 및 Team Battle v2-only 기준 상태 갱신
- v1.12 (2026-01-23, GitHub Copilot): Admin(phase4_admin) 테스트 통과 기록 추가
- v1.11 (2026-01-23, GitHub Copilot): Survey/Inbox 테스트 통과 기록 추가
- v1.10 (2026-01-23, GitHub Copilot): Team Battle 테스트 통과 기록 추가
- v1.9 (2026-01-23, GitHub Copilot): Mission/Attendance 테스트 통과 기록 추가
- v1.8 (2026-01-23, GitHub Copilot): Vault 테스트 통과 기록 추가
- v1.7 (2026-01-23, GitHub Copilot): v2 Vault/Auth/User 경로 변경 및 앵커 보강 반영
- v1.6 (2026-01-23, GitHub Copilot): v2-only 기준 정의 및 Shop/Inventory 반영
- v1.5 (2026-01-23, GitHub Copilot): Shop/Inventory v2-only 정합화 및 테스트 통과 기록 반영
- v1.4 (2026-01-23, GitHub Copilot): Shop/Game/Inventory 테스트 진행도 업데이트
- v1.3 (2026-01-23, GitHub Copilot): 서비스/영역별 체크리스트로 개편
- v1.2 (2026-01-23, GitHub Copilot): 테스트 통과 항목 체크
- v1.1 (2026-01-23, GitHub Copilot): 우선순위 체크리스트 및 파일 앵커 추가
- v1.0 (2026-01-23, GitHub Copilot): 검증 체크리스트 문서 초안 작성
