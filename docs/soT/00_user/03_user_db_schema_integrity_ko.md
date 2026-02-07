문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/OPS
상태: SoT

## 0. 요약
- 유저 관련 FK는 v2_user를 기준으로 통일한다.
- 금고 SoT는 user.vault_locked_balance를 유지한다.
- PK/UNIQUE/INDEX 누락은 운영 장애의 주요 원인이다.

## 1. 목적
유저 관련 DB 스키마, 제약조건, 무결성 기준을 정리한다.

## 2. 핵심 테이블
### 2.1 v2_user
- 주요 컬럼: id, cc_id, nickname, telegram_id, level, xp, total_charge_amount
- UNIQUE: cc_id, telegram_id

### 2.2 user
- 금고 SoT: vault_locked_balance
- 레거시 호환 정보 보관

### 2.3 v2_user_segment
- segment, pending_segment, total_margin, total_charge
- FK: user_id -> v2_user.id

### 2.4 external_ranking_data
- CC 입금 누적 스냅샷
- FK: user_id -> v2_user.id

### 2.5 external_ranking_daily_deposit_delta
- 일별 입금 델타
- FK: user_id -> v2_user.id

## 3. FK 마이그레이션 원칙
### 3.1 기본 원칙
- V2 시스템은 v2_user 참조를 기본값으로 한다.
- 레거시 user 참조 FK는 단계적으로 제거한다.

### 3.2 오너 데이터 정합성
- FK 변경 전 orphan 데이터 정리
- FK 이름 불일치 대비 safe drop/create 사용

## 4. 제약조건 규칙
### 4.1 UNIQUE/PK
- 중복 가입 방지: cc_id, telegram_id
- 동일 ID 원칙: v2_user.id == user.id

### 4.2 CHECK
- 세그먼트 키는 허용 목록으로 제한한다.
- ENUM은 서비스 레벨과 일치해야 한다.

## 5. 시간대 규칙
- created_at, updated_at은 KST 기준으로 기록한다.
- 운영일은 09:00 KST 기준이다.

## 6. 정합성 리스크
- benefits_suspended는 DB 필드가 아닌 계산식이다.
- 세그먼트 배치 미작동 시 오지급 위험이 있다.
- user/v2_user 동기화 누락은 FK 오류를 유발한다.

## 7. FK 기준 목록 (대표)
- trial_token_bucket.user_id -> v2_user.id
- user_level_progress.user_id -> v2_user.id
- user_xp_event_log.user_id -> v2_user.id
- user_streak.user_id -> v2_user.id
- vault_ledger.user_id -> v2_user.id
- vault_withdrawal_request.user_id -> v2_user.id

## 8. 인덱스 기준
### 8.1 필수 인덱스
- v2_user.cc_id UNIQUE
- v2_user.telegram_id UNIQUE
- v2_user_segment.user_id PK
- external_ranking_data.user_id UNIQUE

### 8.2 권장 인덱스
- v2_user_segment.segment
- external_ranking_daily_deposit_delta.kst_date
- hq_prospective_user.nickname

## 9. 제약조건 상세
### 9.1 세그먼트 체크
- segment IN (NEW, COMMON, VIP, WHALE, AT_RISK, WINNER)

### 9.2 금고 SoT 제약
- vault_locked_balance는 음수 불가
- 신규 write는 금고 SoT 경로만 허용

## 10. 마이그레이션 히스토리
- 2026-01-30: external_ranking FK v2_user 전환
- 2026-01-31: 다중 테이블 FK v2_user 전환
- 2026-02-04: 세그먼트 CHECK 제약조건 추가

## 11. 데이터 정합성 점검 시나리오
### 11.1 ID 불일치
- v2_user.id와 user.id 불일치 여부 확인

### 11.2 FK 오류
- 특정 API 500 발생 시 FK 제약조건 확인

### 11.3 orphan 데이터
- v2_user 미존재 레거시 데이터 삭제 또는 이관

## 12. 주요 컬럼 요약
| 테이블 | 컬럼 | 설명 |
| --- | --- | --- |
| v2_user | cc_id | V2 인증 기준 |
| v2_user | nickname | 운영자 표시 기준 |
| v2_user | level | V2 레벨 SoT |
| v2_user | xp | V2 XP SoT |
| user | vault_locked_balance | 금고 SoT |
| v2_user_segment | segment | CRM 세그먼트 |
| external_ranking_data | deposit_amount | 누적 입금 |

## 13. 마이그레이션 적용 전 점검
- FK 이름 확인
- orphan 데이터 삭제 스크립트 검토
- rollback 경로 점검

## 14. 마이그레이션 적용 후 점검
- alembic current 확인
- 주요 API 200 확인
- FK 재조회 결과 확인

## 15. 운영 점검 SQL
```sql
-- v2_user 미존재 user 확인
SELECT id FROM user WHERE id NOT IN (SELECT id FROM v2_user);

-- 세그먼트 미갱신 확인
SELECT COUNT(*) FROM v2_user_segment WHERE updated_at < NOW() - INTERVAL 25 HOUR;

-- 세그먼트 허용값 위반 확인
SELECT segment, COUNT(*) FROM v2_user_segment
WHERE segment NOT IN ('NEW','COMMON','VIP','WHALE','AT_RISK','WINNER')
GROUP BY segment;
```

## 16. 운영 체크리스트
- FK 변경 전 orphan 삭제 여부
- 신규 테이블 생성 시 v2_user FK 여부
- CHECK/ENUM 범위 일치 여부
- 인덱스 누락 여부

## 17. 장애 사례 요약
- FK 참조 대상 불일치로 500 발생
- 인덱스 누락으로 조회 지연 발생

## 18. DB 스냅샷 기준
- 마이그레이션 전후 스냅샷 보관
- 롤백 필요 시 스냅샷 기준 복구

## 19. 운영 예외 처리
- FK 변경 실패 시 즉시 롤백
- orphan 정리 실패 시 배포 중단

## 18. 참고 문서
- [다중 테이블 FK 수정](아카이브/2026_01_31_multi_table_fk_fix.md)
- [FK/Mission/Sentry 이슈](아카이브/2026_01_30_fk_mission_sentry.md)
- [레거시 의존성 감사](아카이브/v2_legacy_user_migration_audit_20260130.md)

## 19. 변경 이력
- v1.0 (2026-02-07): 아카이브 통합 SoT 5문서 중 3권으로 작성
