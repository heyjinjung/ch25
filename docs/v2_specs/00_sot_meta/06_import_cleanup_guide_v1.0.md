# V2 Import Cleanup Guide

문서 타입: 가이드
버전: v1.2
작성일: 2026-01-23
작성자: GitHub Copilot
대상 독자: V2 마이그레이션 작업자, V2 검증 담당자

## 1. 목적
V2 코드에서 V1 서비스/라우트 import를 제거하는 절차와 기록 기준을 정의한다.

## 2. 범위
- Backend: app/v2/**
- 문서: docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md, docs/v2_specs/00_sot_meta/v2_verification_checklist_ko.md

## 3. 용어 정의
- V1 import: app.services.* 또는 app.api.routes.* 등 V1 네임스페이스 참조
- Functional Verified: 테스트 통과 등 기능 검증 완료 상태
- Architectural Migrated: V1 import 제거 + V2 전용 서비스/테이블 사용 확인 상태
- v2-only 기준: V2 config/log 테이블 + V2 엔진/서비스 사용 + V1 import 제거

## 4. 원칙
1) 기능 검증과 아키텍처 이관은 분리 기록한다.
2) V1 import 제거는 “아키텍처 이관” 체크리스트 기준이다.
3) 변경은 최소 diff로 진행하고, 기존 동작을 유지한다.

## 5. 영역별 카테고리(앵커)
- [Auth](#51-auth)
- [Vault](#52-vault)
- [Shop](#53-shop)
- [Inventory](#54-inventory)
- [Mission/Attendance](#55-missionattendance)
- [Team Battle](#56-team-battle)
- [Survey/Inbox](#57-surveyinbox)
- [Admin](#58-admin)

## 5. 절차
1) 스캔
   - app/v2/** 내 V1 import 확인
   - 참고 문서: docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md
2) 대체
   - V2 전용 서비스로 교체 (예: app/v2/services/*)
   - V2 테이블/로그 사용 여부 확인
3) 정리
   - 불필요 import 제거
   - 로직 중복 제거(리팩토링 금지, 최소 수정)
4) 기록
   - docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md에서 제거된 항목 갱신
   - docs/v2_specs/00_sot_meta/v2_verification_checklist_ko.md의 v2-only 항목 갱신

## 6. 스캔 체크리스트
- [ ] app/v2/** 에서 app.services.* import 없음
- [ ] app/v2/** 에서 app.api.routes.* import 없음
- [ ] v2-only 기준을 만족하는 서비스/라우트만 완료 처리
- [x] Vault v1 import 제거 확인 — 검증: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py (실행: 2026-01-23, Exit Code: 0)
- [x] Game(roulette/dice/lottery) v1 import 제거 확인 — 검증: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py (실행: 2026-01-23, Exit Code: 0)
- [x] Mission/Attendance v1 import 제거 확인 — 검증: pytest -q tests/v2_tests/phase2_core/test_v2_mission_service.py && pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py (실행: 2026-01-23, Exit Code: 0)

## 7. QA/검증
- 기능 검증: 기존 테스트 또는 스모크 테스트 통과 여부 확인
- 아키텍처 검증: V1 import 제거 + V2 테이블/서비스 사용 확인

## 8. 실행 명령(예시)
```bash
grep -R "from app.services" app/v2
grep -R "from app.api.routes" app/v2
```

## 9. 영역별 체크 포인트
### 5.1 Auth
- V1 alias 라우트 제거 확인
- V2 auth/user 경로가 단독으로 동작하는지 확인
- 현재 텔레그램 인증 이슈로 이후 진행예정 

### 5.2 Vault ✅
- V1 VaultService import 제거 완료
- V2VaultService 단독 사용 및 Admin 관련 로직 이관 완료
- 검증: pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py (통과 확인)

### 5.3 Shop ✅
- V1 UiConfigService/IdempotencyService import 제거 확인
- 검증 실행: `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` & `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` — 실행(2026-01-23) 통과 (Exit Code: 0)
- v2_shop_products/v2_shop_order 경유 확인

### 5.4 Inventory ✅
- V1 모델(UserGameWallet/UserGameWalletLedger) 의존 제거 확인
- 검증 실행: `pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py` & `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` — 실행(2026-01-23) 통과 (Exit Code: 0)
- V2 전용 모델/로그 경유 확인

### 5.5 Mission/Attendance ✅
- V1 MissionService/RewardService import 제거 확인
- 검증 실행: pytest -q tests/v2_tests/phase2_core/test_v2_mission_service.py && pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py — 실행(2026-01-23) 통과 (Exit Code: 0)
- V2 미션 서비스 단독 사용 확인

### 5.6 Team Battle ✅
- V1 TeamBattleService import 제거
- V2 팀배틀 서비스 단독 사용 확인

### 5.7 Survey/Inbox ✅
- V1 SurveyService import 제거
- V2 설문 서비스 단독 사용 확인
   - 확인: [app/v2/api/routes.py](app/v2/api/routes.py#L843-L933)에서는 V2SurveyService만을 import/사용하며 SurveyService에 대한 V1 참조가 없습니다.

### 5.8 Admin []
- 어드민 라우트에서 V1 서비스 import 제거
- V2Admin*Service 단독 사용 확인
   - 상태: [app/v2/api/admin/vault_routes.py](app/v2/api/admin/vault_routes.py) 및 [app/v2/api/admin_cc_deposit.py](app/v2/api/admin_cc_deposit.py)의 V2 이관 완료.
   - [app/v2/api/admin/economy_routes.py](app/v2/api/admin/economy_routes.py#L454-L456) 등에서는 `app.services.*` 경로를 그대로 사용 중이나, 미션/리워드 병렬 작업 진행을 위해 이 영역은 최후순위로 미루고 작업 진행 예정.

## 10. 변경 이력
- v1.2 (2026-01-23, GitHub Copilot): Shop/Inventory V1 import 제거 검증 실행 및 통과 기록 추가
- v1.1 (2026-01-23, GitHub Copilot): Mission/Attendance 및 Game 영역 V1 import 제거 검증 실행 및 통과 기록 추가
- v1.1 (2026-01-23, GitHub Copilot): 영역별 카테고리 앵커 및 체크 포인트 추가
- v1.0 (2026-01-23, GitHub Copilot): 최초 작성
