문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: OPS/QA
상태: SoT

## 0. 요약
- 증상은 반드시 구조화해서 기록한다.
- 로그와 제약조건 기반으로 원인을 규명한다.
- 검증은 DB, API, FE 모두 확인한다.

## 1. 목적
유저 영역 운영/검증/트러블슈팅 표준을 제공한다.

## 2. 증상 정의 포맷
| 항목 | 내용 |
| --- | --- |
| 대상 기능 | 예: 로그인, 금고 조회 |
| HTTP Status | 500/400/200 |
| 영향 범위 | 특정 유저 vs 전체 |
| 재현 빈도 | 항상 vs 간헐 |

## 3. 증거 기반 RCA
- Stack Trace를 확보한다.
- DB 제약조건 위반 여부를 확인한다.
- 코드 로직과 DB 데이터를 대조한다.

## 4. 풀스택 검증
### 4.1 DB
- alembic current 확인
- FK/INDEX/ENUM 정합성 점검

### 4.2 API
- /api/v2/user/* 응답 확인
- /api/v2/admin/users/* 권한 확인

### 4.3 FE
- DTO alias 일치 여부 확인
- 방어적 코딩 여부 확인

## 5. 자주 발생하는 이슈
### 5.1 FK 충돌
- v2_user 참조 미적용
- orphan 데이터 존재

### 5.2 09:00 리셋 불일치
- 미션/금고/통계 기준 불일치

### 5.3 계산식 필드 혼선
- benefits_suspended는 DB 필드가 아님

## 6. 운영일/타임존 기준
- 모든 계산은 Asia/Seoul 기준이다.
- 운영일 리셋은 09:00 KST이다.

## 7. 검증 시나리오
### 7.1 로그인
- v2_user 존재 여부 확인
- 토큰 발급 성공 여부 확인

### 7.2 금고
- vault_locked_balance 변화 확인
- 금고 상태 API 200 확인

### 7.3 세그먼트
- v2_user_segment 최신 갱신 확인
- 신규 유저 7일 정책 적용 확인

### 7.4 레벨/XP
- v2_user.level, v2_user.xp 동기화 확인
- user_level_progress 동기화 확인

## 8. 장애 대응 플로우
1) 증상 정의 표 작성
2) 로그/스택 트레이스 확보
3) DB 제약조건 확인
4) 코드/데이터 비교
5) 임시 조치 기록

## 9. 표준 체크리스트
- alembic current 확인
- v2_user와 user 불일치 여부 확인
- FK/INDEX 누락 여부 확인
- 레거시 경로 호출 여부 확인

## 10. 운영 점검 SQL
```sql
-- v2_user 미존재 user 확인
SELECT id FROM user WHERE id NOT IN (SELECT id FROM v2_user);

-- 세그먼트 최신 갱신 여부
SELECT COUNT(*) FROM v2_user_segment WHERE updated_at < NOW() - INTERVAL 25 HOUR;
```

## 11. 에러 트리아지 예시
### 11.1 FK 에러
- HTTP 500
- IntegrityError 1452
- FK 참조 대상 확인

### 11.2 로그인 실패
- HTTP 400 LOGIN_FAILED
- MissionService 중복 생성 여부 확인

## 12. 운영 커뮤니케이션
- 장애 발생 시 영향 범위/복구 예상 시간 명시
- 임시 조치와 영구 조치 구분

## 13. 보고서 작성 항목
- 증상 정의 표
- 로그/스택 트레이스
- DB 제약조건 결과
- 임시 조치
- 재발 방지 항목

## 13. 표준 진단 커맨드
```bash
docker compose exec backend alembic current
docker compose logs backend --tail=50
```

## 14. 연계 문서
- [에러 트리아지 체크리스트](아카이브/20260130_error_triage_checklist.md)
- [권한 제약 트러블슈팅](아카이브/v2_troubleshooting_20260120_permission_restriction_ko.md)
- [유저 일관성 가이드](아카이브/user_consistency_guide.md)

## 15. 변경 이력
- v1.0 (2026-02-07): 아카이브 통합 SoT 5문서 중 5권으로 작성
