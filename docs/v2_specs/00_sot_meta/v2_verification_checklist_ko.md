문서 타입: 가이드
버전: v1.8
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
- **v2-only 기준**: v2 config/log 테이블 + v2 엔진 서비스 사용이 확인되어야 “완료”로 기록한다.

### 3.2 서비스/영역별 Unit & Integration
#### 3.2.1 Auth
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)

#### 3.2.2 Vault
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py, tests/v2_tests/phase2_core/test_vault_limit_suspension.py, tests/v2_tests/phase2_core/test_vault2_service.py)
	- 커맨드: pytest -q tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py tests/v2_tests/phase2_core/test_vault_limit_suspension.py tests/v2_tests/phase2_core/test_vault2_service.py

#### 3.2.3 Shop
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_shop_inventory_logic.py)
- [x] v2-only 기준 충족 (v2_shop_products + v2_shop_order + V2ShopService)

#### 3.2.4 Game (roulette/dice/lottery)
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase3_game/test_game_engine_smoke.py)

#### 3.2.5 Inventory
- [x] 단위 테스트 추가
- [x] 통합 테스트 추가
- [x] 테스트 전부 통과 기록 (tests/v2_tests/phase2_core/test_shop_inventory_logic.py)
- [x] v2-only 기준 충족 (v2_exchange_log + V2InventoryService)

#### 3.2.6 Mission/Attendance
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)

#### 3.2.7 Team Battle
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)

#### 3.2.8 Survey/Inbox
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)

#### 3.2.9 Admin (Low)
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록 (파일/커맨드)

### 3.3 E2E 스모크 테스트 (핵심 플로우)
- [ ] 로그인 → 홈 진입
- [ ] 상점 조회 → 구매
- [ ] 인벤토리 조회 → 아이템 사용
- [ ] 미션 조회 → 클레임
- [ ] 금고 상태 조회

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
- [ ] High: 금고(Vault) 읽기/쓰기
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
- [app/api/routes/vault.py](app/api/routes/vault.py)
- [app/services/vault_service.py](app/services/vault_service.py)
- [app/v2/services/user_service.py](app/v2/services/user_service.py)
- [app/models/user.py](app/models/user.py)

## 5. 변경 이력
- v1.8 (2026-01-23, GitHub Copilot): Vault 테스트 통과 기록 추가
- v1.7 (2026-01-23, GitHub Copilot): v2 Vault/Auth/User 경로 변경 및 앵커 보강 반영
- v1.6 (2026-01-23, GitHub Copilot): v2-only 기준 정의 및 Shop/Inventory 반영
- v1.5 (2026-01-23, GitHub Copilot): Shop/Inventory v2-only 정합화 및 테스트 통과 기록 반영
- v1.4 (2026-01-23, GitHub Copilot): Shop/Game/Inventory 테스트 진행도 업데이트
- v1.3 (2026-01-23, GitHub Copilot): 서비스/영역별 체크리스트로 개편
- v1.2 (2026-01-23, GitHub Copilot): 테스트 통과 항목 체크
- v1.1 (2026-01-23, GitHub Copilot): 우선순위 체크리스트 및 파일 앵커 추가
- v1.0 (2026-01-23, GitHub Copilot): 검증 체크리스트 문서 초안 작성
