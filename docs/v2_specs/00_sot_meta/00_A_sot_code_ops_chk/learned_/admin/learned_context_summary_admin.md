# V2 Admin 영역 1~3차 학습 요약 (DB/OPS 실전 이슈/리스크 보강)

## [2026-01-24 구현 완료 항목]

### 1. Reset-time Unification (09:00 KST 통일) ✅
- **문제**: `AdminDashboardService`가 00:00 KST 기준 사용 vs V2 서비스들(mission, vault)이 09:00 KST 사용
- **해결**:
  - `app/utils/timezone.py` 신규 생성 - `business_day_start()`, `yesterday_business_day_range()` 헬퍼
  - `app/services/admin_dashboard_service.py` 수정 - 00:00→09:00 KST 통일
- **검증**: 모든 일간 집계가 09:00 KST ~ 익일 08:59:59 KST 기준으로 동작

### 2. Global Circuit Breaker (Payout Safety) ✅
- **문제**: SoT 문서에만 존재하던 서킷 브레이커 코드 미구현
- **해결**:
  - `app/services/circuit_breaker.py` 신규 생성
    - Redis 기반 일일 지급 추적
    - CLOSED/OPEN/HALF_OPEN 상태 관리
    - 50M 기본 한도, 80% 경고 임계값
    - DB fallback 지원
  - `app/v2/services/vault2_service.py` 수정 - `record_unlock_event()`에 서킷 브레이커 훅 추가
- **검증**: `skip_circuit_breaker=True` 옵션으로 관리자 강제 지급 가능

### 3. V2 Team-Battle Admin ✅
- **문제**: V2 팀배틀 어드민 API 레이어 없음
- **해결**:
  - `app/v2/services/team_battle_admin_service.py` 신규 생성
    - 시즌 CRUD (create/update/end)
    - 팀 관리 (create/update/detail)
    - 점수 조정 (`adjust_team_score`)
    - 멤버 강제 관리 (`force_join_team`, `force_leave_team`)
    - 시즌 통계 (`get_season_stats`)
  - `app/v2/api/admin/team_battle_routes.py` 신규 생성
    - `/admin/team-battle/seasons/*` 시즌 엔드포인트
    - `/admin/team-battle/teams/*` 팀 엔드포인트
    - `/admin/team-battle/scores/adjust` 점수 조정
    - `/admin/team-battle/members/force-join`, `/force-leave` 멤버 관리
  - `app/v2/api/admin/__init__.py` 수정 - 라우터 등록
- **검증**: 모든 어드민 작업에 V2AdminAuditService 감사 로그 기록

### 4. Admin Audit Logs — Full Coverage ✅
- **문제**: 감사 로그가 일부 영역(economy, inventory, game_config, vault)에만 적용
- **해결**:
  - `app/v2/middleware/admin_audit.py` 신규 생성
    - `@audit_admin` 데코레이터
    - `log_admin_action()` 헬퍼 함수
  - `app/v2/api/admin/segment_routes.py` 수정 - 감사 로그 추가
    - `SEGMENT_BATCH_RUN`, `SEGMENT_RULE_CREATE/UPDATE/DELETE`
  - `app/v2/api/admin/marketing_routes.py` 수정 - 감사 로그 추가
    - `MARKETING_MESSAGE_CREATE`, `SURVEY_CREATE/UPDATE/DELETE`
- **검증**: 모든 어드민 CRUD 작업이 `admin_audit_log` 테이블에 기록

---

## [DB/OPS 실전 이슈/리스크/운영상 주의]
- FK/UNIQUE/INDEX 누락·불일치로 인한 메시지/인박스 중복, 잘못된 수신/읽음 처리, 데이터 유실/조회 오류
- v2_admin_message, v2_admin_message_inbox, v2_user 등 테이블 간 동기화/이관 누락 시 메시지 누락/중복/오작동
- is_read/read_at/created_at 등 상태 필드 NULL/불일치/미적용으로 인한 운영/통계 오류
- target_type/target_value/channels 등 정책/DB/코드/프론트 매핑 불일치로 인한 메시지 오발송/누락/권한 오류
- OPS 액션(Worker/Async) 처리 시 대량 메시지/지급/상태변경에서 Deadlock, 멱등성 미보장, 중복 지급/오류 발생
- DB 마이그레이션/스냅샷/롤백 시 메시지/인박스/OPS 연관 테이블 일관성 필수

### [실제 장애/운영 사례]
- 메시지 인박스 FK 불일치로 일부 유저 메시지 미수신/중복
- OPS 대량 지급/상태변경 시 Deadlock, 멱등성 미보장으로 인한 중복 지급/오류
- target_type/target_value 정책/DB/코드/프론트 미일치로 메시지 오발송/누락/권한 오류
- is_read/read_at 미적용/불일치로 통계/운영 리포트 오류

---

## [신규 파일 목록]

| 파일 | 용도 |
|------|------|
| `app/utils/timezone.py` | 비즈니스 일자 헬퍼 (09:00 KST 기준) |
| `app/services/circuit_breaker.py` | 글로벌 지급 서킷 브레이커 |
| `app/v2/services/team_battle_admin_service.py` | 팀배틀 어드민 서비스 |
| `app/v2/api/admin/team_battle_routes.py` | 팀배틀 어드민 API 라우트 |
| `app/v2/middleware/admin_audit.py` | 감사 로그 데코레이터/헬퍼 |

---

## [수정 파일 목록]

| 파일 | 변경 내용 |
|------|----------|
| `app/services/admin_dashboard_service.py` | 00:00→09:00 KST 통일 |
| `app/v2/services/vault2_service.py` | 서킷 브레이커 훅 추가 |
| `app/v2/api/admin/__init__.py` | team_battle_routes 라우터 등록 |
| `app/v2/api/admin/segment_routes.py` | 감사 로그 추가 |
| `app/v2/api/admin/marketing_routes.py` | 감사 로그 추가 |

---
(본 요약은 v2_db_admin_message_inbox_ko.md, v2_db_admin_message_ko.md, v2_admin_message_policy_sot_ko.md, v2_ops_action_glossary_sot_ko.md 등에서 Admin 관련 내용만 추출/정리한 1~3차 학습 결과입니다.)
