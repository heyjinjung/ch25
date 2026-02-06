문서 타입: 감사 리포트
버전: v1.0
작성일: 2026-01-30
작성자: GitHub Copilot
대상: V2 마이그레이션 작업자
상태: Active

## 1. 목적
V2 코드베이스에서 레거시 `app.models.user.User` 의존성을 전역 조사하고,
V2User 단일 SoT 전환을 위한 마이그레이션 범위와 우선순위를 정의한다.

## 2. 현황 요약 (2026-01-30 기준)

### 2.1 V2 서비스 레이어 (app/v2/services/*.py)
| 파일명 | 의존성 유형 | 우선순위 | 비고 |
|--------|-------------|----------|------|
| **user_service.py** | User import + ensure_legacy_user_id 정의 | 🔴 High | 핵심 브릿지 서비스, 폐기 대상 |
| **vault_service.py** | User import + ensure_legacy_user_id x4 | 🔴 High | 금고 핵심, vault_locked_balance SoT |
| **mission_service.py** | User import | 🔴 High | 미션 핵심 |
| **streak_service.py** | User import | 🔴 High | 스트릭 핵심 |
| **reward_service.py** | ensure_legacy_user_id | 🔴 High | 보상 핵심 |
| **inventory_service.py** | ensure_legacy_user_id | 🟡 Medium | 인벤토리 |
| **admin_user_service.py** | User import | 🟡 Medium | 어드민 유저 관리 |
| **admin_cc_deposit_service.py** | User import | 🟡 Medium | CC 입금 |
| **team_battle_service.py** | User import x6 (함수 내부) | 🟡 Medium | 팀배틀 |
| vault2_service.py | User import x2 | 🟡 Medium | Vault V2 |
| vault_legacy_bridge.py | User import x2 | 🟡 Medium | 레거시 브릿지 |
| admin_economy_service.py | User import (함수 내부) | 🟢 Low | 어드민 경제 |
| csv_import_service.py | User import | 🟢 Low | CSV 임포트 |
| daily_nudge_service.py | User import | 🟢 Low | 넛지 |
| event_service.py | User import | 🟢 Low | 이벤트 |
| retention_intervention_service.py | User import | 🟢 Low | 리텐션 |
| roi_analysis_service.py | User import | 🟢 Low | ROI 분석 |
| rollback_service.py | User import | 🟢 Low | 롤백 |
| team_battle_admin_service.py | User import | 🟢 Low | 팀배틀 어드민 |
| v2_admin_ops_plan_service.py | User import | 🟢 Low | Ops Plan |
| v2_lottery_game_service.py | ensure_legacy_user_id | 🟢 Low | 복권 게임 |

### 2.2 V2 API 라우트 레이어 (app/v2/api/admin/*.py)
| 파일명 | 의존성 유형 | 우선순위 | 비고 |
|--------|-------------|----------|------|
| **user_routes.py** | User import + query(User) x6 | 🔴 High | 유저 CRUD |
| **streak_routes.py** | User import + query(User) x3 | 🔴 High | 스트릭 관리 |
| **mission_routes.py** | User import + query(User) x2 | 🔴 High | 미션 관리 |
| vault_routes.py | User import + query(User) | 🟡 Medium | 금고 관리 |
| ops_routes.py | User import + query(User) x3 | 🟡 Medium | 운영 대시보드 |
| inventory_routes.py | User import + query(User) x2 | 🟡 Medium | 인벤토리 관리 |
| economy_routes.py | User import | 🟡 Medium | 경제 관리 |
| team_battle_routes.py | User import | 🟡 Medium | 팀배틀 관리 |
| analytics_routes.py | User import | 🟢 Low | 분석 |

### 2.3 핵심 공유 서비스 (app/services/*.py)
| 파일명 | 의존성 유형 | 비고 |
|--------|-------------|------|
| game_common.py | User import + ensure_legacy_user_id | 게임 공통 로직 |
| dice_service.py | User import | 주사위 |
| lottery_service.py | User import | 복권 |
| roulette_service.py | User import x2 | 룰렛 |
| reward_service.py | User import | 보상 |
| mission_service.py | User import | V1 미션 (폐기 대상) |
| inventory_service.py | User import | V1 인벤토리 (폐기 대상) |

## 3. 마이그레이션 전략

### 3.1 핵심 원칙
1. **V2User = 단일 SoT**: 모든 유저 조회/인증은 V2User 테이블 기준
2. **ensure_legacy_user_id 폐기**: V1↔V2 브릿지 함수 제거
3. **금고 SoT 유지**: `user.vault_locked_balance`는 현행 유지 (별도 마이그레이션)
4. **점진적 전환**: 서비스 레이어 → API 레이어 → 테스트 코드 순서

### 3.2 1단계: 핵심 서비스 전환 (우선순위 🔴)
**대상 파일:**
- `app/v2/services/user_service.py`: ensure_legacy_user_id → V2User.id 직접 사용
- `app/v2/services/mission_service.py`: User → V2User 전환
- `app/v2/services/streak_service.py`: User → V2User 전환
- `app/v2/services/reward_service.py`: ensure_legacy_user_id 제거
- `app/v2/services/vault_service.py`: ensure_legacy_user_id 제거 (단, vault_locked_balance FK는 유지)

### 3.3 2단계: API 라우트 전환 (우선순위 🔴)
**대상 파일:**
- `app/v2/api/admin/user_routes.py`: query(User) → query(V2User)
- `app/v2/api/admin/streak_routes.py`: query(User) → query(V2User)
- `app/v2/api/admin/mission_routes.py`: query(User) → query(V2User)

### 3.4 3단계: 보조 서비스 전환 (우선순위 🟡)
**대상 파일:**
- `app/v2/services/inventory_service.py`
- `app/v2/services/admin_user_service.py`
- `app/v2/services/team_battle_service.py`
- `app/v2/api/admin/vault_routes.py`
- `app/v2/api/admin/ops_routes.py`

### 3.5 4단계: V1 서비스 폐기 (우선순위 🟢)
**대상 파일:**
- `app/services/mission_service.py` (V1)
- `app/services/inventory_service.py` (V1)
- 기타 분석/롤백/이벤트 서비스

## 4. 금고 SoT 특별 고려사항

### 4.1 현행 정책 (v2_user_sot_ko.md 참조)
- **금고 SoT**: `user.vault_locked_balance` (V1 테이블, 단일 원장)
- **V2User와 분리**: 유저 식별은 V2User, 금고 잔액은 V1 User 테이블

### 4.2 마이그레이션 옵션
1. **Option A (권장)**: V2User에 vault_locked_balance 컬럼 추가 + 데이터 마이그레이션
2. **Option B**: V1 User 테이블을 금고 전용으로 유지 (FK로 연결)
3. **Option C**: 별도 v2_vault 테이블 생성

## 5. 테스트 영향 범위
- `tests/v2_tests/phase2_core/test_mission_*.py`
- `tests/v2_tests/phase3_game/test_game_*.py`
- `tests/v2_tests/phase4_admin/test_admin_*.py`
- `tests/v2_tests/phase5_public/test_*.py`

## 6. 참조 문서
- [V2 User SoT](docs/v2_specs/01_core/v2_user_sot_ko.md)
- [V1/V2 의존성 인벤토리](docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md)
- [Learned User SoT](docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/user/02.user.md)

## 7. 변경 이력
- v1.0 (2026-01-30, GitHub Copilot): 최초 작성 - 전역 레거시 User 의존성 감사

