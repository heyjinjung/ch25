문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: DB (DB/마이그레이션)
상태: ACTIVE

# W05 DB 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 02-02 | Phase4 Admin 회귀 테스트 실패 (Admin/Economy/Vault/Segment) | 🔴 OPEN |
| 01-31 | V2 로그/주문 테이블 FK 누락 | ✅ RESOLVED |
| 01-31 | V2 도메인 FK 전체 감사 | ✅ RESOLVED |
| 01-30 | user_activity FK 오류 | ✅ RESOLVED |
| 01-20 | [DB] Alembic 리비전 그래프 단절 및 더미 마이그레이션 누락 | ✅ FIXED |

---

## 01-31 - [DB] V2 로그/주문 테이블 (Dice, Roulette, Lottery, Shop) FK 누락

**우선순위**: P1
**관련 도메인**: DB, GAME, INVENTORY

### 증상
- V2 전수 감사 중 `v2_dice_log`, `v2_roulette_log`, `v2_lottery_log`, `v2_shop_order` 테이블에 `user_id` -> `v2_user.id` 물리적 FK 제약조건이 누락된 것을 발견.
- 어플리케이션 로직상으로는 정상 작동하나, DB 레벨의 무결성 강제가 불가능함.

### 근본 원인
- **기술적 원인**: 초기 V2 아키텍처 설계 시 로그성 데이터의 삽입/삭제 성능 저하를 우려하여 FK를 의도적으로 생략했으나, 유저 탈퇴 대응(`purge_user`) 스펙이 확정되면서 자동 연쇄 삭제 필요성이 제기됨.

### 해결 방법
#### Immediate Fix
- `alembic` 마이그레이션(`20260131_1500_add_v2_user_fk_to_log_tables.py`) 적용.
- `ON DELETE SET NULL` 옵션을 사용하여 유저가 삭제되어도 개별 로그/주문 데이터는 감사(Audit) 목적으로 DB에 남도록 설정 (`user_id` 컬럼만 null 처리).

### 검증 방법
- `SHOW CREATE TABLE v2_shop_order` 명령어 실행 시 `v2_user` 테이블 대상의 CONSTRAINT 항목이 정상 노출되는지 확인.

---

## 02-02 - [ADMIN/ECONOMY/Vault/Segment] Phase4 Admin 회귀 테스트 실패

**우선순위**: P1
**관련 도메인**: ADMIN, ECONOMY, VAULT, SEGMENT

### 증상 정의 (에러 트리아지 체크리스트)
| 항목 | 내용 |
|---|---|
| 대상 기능 | Admin API (경제/출금/권한/세그먼트), Phase4 Admin 회귀 테스트 |
| HTTP Status | 500 (서버 에러), 200(Logic Error) |
| 영향 범위 | 로컬 테스트 환경(Phase4 Admin 스위트) |
| 재현 빈도 | 항상 |

### 증상
- `pytest -q tests/v2_tests/phase4_admin` 실행 시 다수 실패 (10 failed)
- 대표 에러:
	- `TypeError: 'external_id' is an invalid keyword argument for V2User`
	- `AttributeError: 'VaultWithdrawalRequest' object has no attribute 'V2User'`
	- `AssertionError` (XP/금고 잔액/세그먼트 NEW 기대값 불일치)
- 로그:
	- `[CircuitBreaker] Redis Error: Error 111 connecting to localhost:6379. Connection refused.`

### 근거(로그/스택트레이스)
- `app/services/vault_service.py:598`에서 `V2User(id=user_id, external_id=...)` 생성 시도 → `TypeError`
- `app/v2/api/admin/economy_routes.py:263`에서 `r.V2User` 접근 → `AttributeError`
- 테스트 실패 위치:
	- `tests/v2_tests/phase4_admin/test_admin_analytics_baseline.py`
	- `tests/v2_tests/phase4_admin/test_admin_economy_routes_coverage_extended.py`
	- `tests/v2_tests/phase4_admin/test_admin_ops_security.py`
	- `tests/v2_tests/phase4_admin/test_admin_user_routes_coverage_extended.py`
	- `tests/v2_tests/phase4_admin/test_economy_coverage.py`

### 원인 분석 (증거 기반)
- **모델 필드 불일치**: `V2User` 모델에 `external_id` 필드가 없는데 생성자에 전달됨.
- **관계 속성 접근 오류**: `VaultWithdrawalRequest`에서 `V2User` 관계 속성 미정의 상태에서 접근.
- **로직 기대값 불일치**: XP/금고 잔액/세그먼트 결과가 테스트 기대값과 불일치.
- **환경 의존성**: Redis 미가동으로 인한 Circuit Breaker 경고 출력.

### 즉시 조치
- 테스트 실패 로그와 스택트레이스 기록 (본 문서).

### 다음 조치 (TODO)
- `V2User` 생성 경로에서 필드 정합성 점검 (external_id 사용 여부).
- 출금 리스트 조회 로직에서 관계 속성 명칭/조인 관계 확인.
- XP/금고/세그먼트 로직 기대값과 최신 SoT 정합성 재검증.
- 테스트 환경 Redis 의존성 분리 또는 테스트 설정 정리.

### 검증 방법
- 수정 후 `docker compose exec backend pytest -q tests/v2_tests/phase4_admin` 재실행.

---

## 01-31 - [DB] V2 도메인 전수 FK 정합성 감사

**우선순위**: P2
**관련 도메인**: DB, ALL_DOMAINS

### 증상
- V2 Native 완전 전환을 앞두고 전 도메인(Auth, Vault, Mission, Game, Level, Inventory)의 DB 스키마가 `v2_user`를 SoT(Source of Truth)로 정상 참조하는지 확인 필요.

### 근본 원인
- **분석**: 마이그레이션 과정에서 일부 레거시 테이블이 여전히 V1 `user` 테이블을 참조하거나, 새 테이블 생성 시 물리적 FK를 누락할 위험이 상존함.

### 해결 방법
#### Immediate Fix
- `scripts/audit_domain_fks.py` 스크립트 실행을 통해 전 도메인 테이블의 `user_id` 참조 무결성 전수 조사 완료.
- 누락된 FK(게임 로그 3종, 상점 주문 1종) 식별 및 패치 마이그레이션 생성.

### 검증 방법
- 감사 리포트([2026_01_31_v2_domain_audit.md](./2026_01_31_v2_domain_audit.md)) 작성 및 SoT 일치 확인.

---

## 01-30 - user_activity FK 오류

### 증상
```
IntegrityError: Cannot add or update a child row: 
a foreign key constraint fails (`user_activity`, CONSTRAINT `user_activity_ibfk_1` 
FOREIGN KEY (`user_id`) REFERENCES `user` (`id`))
```

### 원인
`user_activity` 테이블이 레거시 `user` 테이블을 참조
V2User 생성 시 `user` 테이블에 해당 ID 없음

### 해결
마이그레이션: `20260130_2500_fix_user_activity_fk.py`
- FK를 `v2_user.id`로 변경

### 관련 파일
- `alembic/versions/20260130_2500_fix_user_activity_fk.py`

---

---

## [REFERENCE] Alembic Legacy 마이그레이션 트러블슈팅

### 1. [DB] 더미 파일 잔존 이슈 (Jan 20)
- **증상**: Alembic 명령 실행 시 `revision` 식별자 누락 에러 발생.
- **원인**: `alembic/versions` 폴더에 필수 변수(`revision`, `down_revision`)가 없는 빈 파일이나 주석만 있는 파일이 잔존.
- **해결**: 불량 파일 영구 삭제. 마이그레이션 아카이빙 시 반드시 파일을 **이동(Move)** 또는 삭제해야 함.

### 2. [DB] Revision 그래프 단절
- **증상**: `Can't locate revision` 에러.
- **해결**: 누락된 revision id에 대해 **no-op shim 마이그레이션**을 추가하여 연결 고리를 복구하거나 `alembic stamp`로 강제 정렬.

---

---

## 01-20 - [DB] Alembic 리비전 그래프 단절 및 더미 마이그레이션 누락

**우선순위**: P2
**관련 도메인**: DB

### 증상
- `alembic upgrade head` 실행 시 `Could not find migration file` 또는 리비전 식별자 오류 발생.
- 특정 환경에서 DB의 `alembic_version`과 소스 코드의 마이그레이션 파일 간 연결 고리(Parent/Child)가 끊어짐.

### 근본 원인
- 협업 과정에서 마이그레이션 파일 삭제 또는 `version_locations` 설정 불일치.
- 레거시 환경에서 사용하던 더미(Dummy) 마이그레이션 파일이 신규 V2 환경에 포함되지 않아 발생.

### 해결 조치
- 누락된 리비전을 채우기 위한 더미 마이그레이션 파일 생성 및 리비전 그래프(`down_revision`) 수동 복구.
- `alembic.ini`의 `version_locations` 경로 재확인.

### 검증 방법
- `alembic current` 및 `alembic history` 명령어가 에러 없이 리스트를 출력하는지 확인.

---

## 변경 이력
- 2026-01-31: W05 DB 문서 생성 및 V2 로그/주문 테이블 FK 감사 내역 기록
- 2026-02-02: FK 명칭 충돌 및 컬럼 누락, 환경 변수 불일치 해결 내역 추가 (Antigravity)
- 2026-02-02: Alembic Legacy 대응 사례 추가 (Antigravity)
- 2026-02-02: DB 마이그레이션(1091/1452) 및 스키마 장애 조치 내역 추가 (Antigravity)
- 2026-02-02: Phase4 Admin 회귀 테스트 실패 기록 추가 (GitHub Copilot)
