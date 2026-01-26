# V2 User 영역 1·2·3차 학습 요약 (DB 실전 이슈/리스크 보강)

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


## 1. 주요 SoT/정책/구조
- DB 테이블: `v2_user`(id, cc_id, nickname, telegram_id, telegram_username, vault_locked_balance, created_at, updated_at), `v2_user_segment`(user_id, segment, updated_at)
- DB 제약조건: PK, UNIQUE, INDEX, FK(v2_user_segment.user_id → v2_user.id) 등 명확히 표기

## 2. 프론트-백엔드-DB-정책 매핑 및 검증
- 프론트엔드 페이지 구조: `/v2/login`, `/v2/home`, `/v2/game`, `/v2/game/roulette`, `/v2/game/dice`, `/v2/game/lottery`, `/v2/inventory`, `/v2/shop`, `/v2/missions`, `/v2/inbox`, `/v2/team-battle` 등으로 구성, 각 페이지별 UI/API 상태 관리

## 3. 인증/유저 API 계약
(본 요약은 v2_user_sot_ko.md, v2_user_segment_policy_sot_ko.md, v2_strict_vault_policy_sot_ko.md, v2_vault_glossary_sot_ko.md, v2_auth_user_api_contract_ko.md, v2_user_frontend_sot_verification_plan_ko.md, v2_db_user_ko.md, v2_db_user_segment_ko.md, V2_user_pages_list.md, admin.md 등에서 User 관련 내용만 추출/정리한 1·2·3차 학습 결과입니다.)
## 4. 자동화/운영 체크리스트
- SoT-코드-운영-DB-프론트 1:1 정합성 자동화 필요
- FK/UNIQUE/ENUM 등 제약조건 자동 점검 필요
- 정책/구현/운영 불일치 시 즉시 표기 및 TODO/임시 예외 명시
- 최신 정책/운영 사례 반영 주기적 검토

## 5. 검증 결과 및 액션
- User 영역은 V2 정책/구조로 이관 및 검증 완료(2026-01-26 기준)
- CC_ID 기준 유저 관리, 금고 SoT, 인벤토리/세그먼트/미션 등 주요 기능 V2 Hook/API로 정상 연동 확인
- 세그먼트/금고/상태/정지 등 정책별 QA 체크리스트 및 자동화 리포트 활용 예정

---
(본 요약은 v2_user_sot_ko.md, v2_user_segment_policy_sot_ko.md, v2_strict_vault_policy_sot_ko.md, v2_vault_glossary_sot_ko.md, v2_auth_user_api_contract_ko.md, v2_user_frontend_sot_verification_plan_ko.md, admin.md 등에서 User 관련 내용만 추출/정리한 1·2차 학습 결과입니다.)
