문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: DB (DB/마이그레이션)
상태: ACTIVE

# W05 DB 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | V2 로그/주문 테이블 FK 누락 | ✅ RESOLVED |
| 01-31 | V2 도메인 FK 전체 감사 | ✅ RESOLVED |
| 01-30 | user_activity FK 오류 | ✅ RESOLVED |

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

## 변경 이력
- 2026-01-31: W05 DB 문서 생성, 기존 분산 문서 통합
