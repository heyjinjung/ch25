# V2 User 영역 1·2·3차 학습 요약 (DB 실전 이슈/리스크 보강)

## [2026-01-26 구현 완료 항목]

### 1. 09:00 KST 리셋 정책 통합 ✅
- **문제**: MissionService(기본값 0)와 VaultService(9) 간 리셋 시간 불일치
- **해결**:
  - `app/services/mission_service.py` 수정 - `_operational_play_date` 기본값 0→9
  - `app/v2/services/vault_service.py` 수정 - `get_admin_stats`가 `app/utils/timezone.py` 헬퍼 사용
- **검증**: Mission/Vault/Admin 모두 09:00 KST 기준으로 통일

### 2. benefits_suspended 로직 정식화 ✅
- **문제**: 7일 무입금 제재 정책이 DB 필드 없이 계산식으로만 존재
- **해결**:
  - `app/v2/services/vault_service.py`에 `is_benefits_suspended()` 정적 메서드 추가
  - `(is_suspended: bool, deposit_7d: int)` 튜플 반환
- **검증**: API 응답에 제재 여부와 7일 입금 합계를 명시적으로 포함 가능

### 3. 세그먼트 배치 동기화 점검 및 자동화 ✅
- **확인**: `scripts/segment_users.py`에 `db.commit()` 정상 포함
- **신규**: `scripts/user_consistency_check.py` 정합성 점검 스크립트 생성
  - `--check segment`: 25시간 내 미업데이트 유저 점검
  - `--check migration`: user↔v2_user 이관 누락 점검
  - `--check suspended`: 7일 무입금 유저 현황
  - `--check index`: 핵심 인덱스 존재 여부
  - `--check all`: 전체 점검

---

## [DB 실전 이슈/리스크/운영상 주의]
- PK/UNIQUE/INDEX 누락·중복·불일치로 인한 유저 중복/조회 오류, 세그먼트/인벤토리/교환 로그 FK 불일치로 장애 다수 발생
- v2_user와 user, v2_user_segment 등 테이블 간 동기화/이관 누락 시 데이터 유실/불일치 위험
- created_at/updated_at KST 미적용, NULL/중복/불일치 등으로 인한 운영/통계 오류
- 교환/인벤토리/상점 등 user_id 기반 연동 시 FK/데이터 정합성 미보장으로 장애 빈발
- v2_user_segment.segment 값/배치 동기화 누락, 인덱스 미적용 시 성능 저하 및 운영 리스크
- DB 마이그레이션/스냅샷/롤백 시 v2_user, v2_user_segment, v2_exchange_log 등 유저 연관 테이블 일관성 필수

### [실제 장애/운영 사례]
- 유저 PK/UNIQUE 누락으로 인한 중복 가입/로그인 불가/데이터 유실
- 세그먼트 배치 동기화 누락으로 인한 잘못된 등급/혜택 지급
- 교환 로그 FK 불일치로 인벤토리/상점/경제 데이터 불일치 및 정산 오류
- created_at/updated_at KST 미적용으로 통계/운영 리포트 오류

---

## [신규/수정 파일 목록]

| 파일 | 변경 내용 |
|------|----------|
| `app/services/mission_service.py` | `_operational_play_date` 기본값 0→9 |
| `app/v2/services/vault_service.py` | `get_admin_stats` 9AM 기준, `is_benefits_suspended()` 추가 |
| `scripts/user_consistency_check.py` | 정합성 점검 스크립트 (신규) |

---

## [Admin 영역과의 연동]
- `app/utils/timezone.py` (Admin에서 생성) 재사용
  - `business_day_start()`, `business_day_end()` 헬퍼
- 09:00 KST 리셋 정책이 Admin/User/Mission/Vault 전 영역에서 통일됨

---

## 1. 주요 SoT/정책/구조
- DB 테이블: `v2_user`(id, cc_id, nickname, telegram_id, telegram_username, vault_locked_balance, created_at, updated_at), `v2_user_segment`(user_id, segment, updated_at)
- DB 제약조건: PK, UNIQUE, INDEX, FK(v2_user_segment.user_id → v2_user.id) 등 명확히 표기

## 2. 프론트-백엔드-DB-정책 매핑 및 검증
- 프론트엔드 페이지 구조: `/v2/login`, `/v2/home`, `/v2/game`, `/v2/game/roulette`, `/v2/game/dice`, `/v2/game/lottery`, `/v2/inventory`, `/v2/shop`, `/v2/missions`, `/v2/inbox`, `/v2/team-battle` 등으로 구성, 각 페이지별 UI/API 상태 관리

## 3. 인증/유저 API 계약
(본 요약은 v2_user_sot_ko.md, v2_user_segment_policy_sot_ko.md, v2_strict_vault_policy_sot_ko.md, v2_vault_glossary_sot_ko.md, v2_auth_user_api_contract_ko.md, v2_user_frontend_sot_verification_plan_ko.md, v2_db_user_ko.md, v2_db_user_segment_ko.md, V2_user_pages_list.md, admin.md 등에서 User 관련 내용만 추출/정리한 1·2·3차 학습 결과입니다.)

## 4. 자동화/운영 체크리스트
- [x] SoT-코드-운영-DB-프론트 1:1 정합성 자동화 (user_consistency_check.py)
- [ ] FK/UNIQUE/ENUM 등 제약조건 자동 점검 필요
- [x] 정책/구현/운영 불일치 시 즉시 표기 및 TODO/임시 예외 명시
- [ ] 최신 정책/운영 사례 반영 주기적 검토

## 5. 검증 결과 및 액션
- User 영역은 V2 정책/구조로 이관 및 검증 완료(2026-01-26 기준)
- CC_ID 기준 유저 관리, 금고 SoT, 인벤토리/세그먼트/미션 등 주요 기능 V2 Hook/API로 정상 연동 확인
- 세그먼트/금고/상태/정지 등 정책별 QA 체크리스트 및 자동화 리포트 활용 예정

---
(본 요약은 v2_user_sot_ko.md, v2_user_segment_policy_sot_ko.md, v2_strict_vault_policy_sot_ko.md, v2_vault_glossary_sot_ko.md, v2_auth_user_api_contract_ko.md, v2_user_frontend_sot_verification_plan_ko.md, admin.md 등에서 User 관련 내용만 추출/정리한 1·2·3차 학습 결과입니다.)
