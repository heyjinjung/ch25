# [ADMIN] 트러블슈팅 가이드

**작성일:** 2026-02-12
**우선순위:** P1

## 증상 정의 (필수)
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 유저 퍼지 (User Purge) |
| HTTP Status | 500 Internal Server Error |
| 영향 범위 | 전체 (유저 퍼지 기능 사용 시) |
| 재현 빈도 | 항상 |

## 증상
- 어드민 패널에서 유저 퍼지 시도 시 `500 Internal Server Error` 발생.
- 클라이언트 에러 메시지: `ERR_BAD_RESPONSE`.

## 근본 원인 (증거 기반)
- `V2AdminUserService.purge_user` 메서드에서 유저 삭제(`db.delete(user)`) 전에 연관 데이터를 수동으로 삭제함.
- 최근 추가된 `UserSeoDailyCodeClaim` 등 일부 테이블의 삭제 로직이 누락됨.
- `UserSeoDailyCodeClaim` 모델의 `user_id` 외래 키에 `ON DELETE CASCADE`가 설정되어 있지 않거나 동작하지 않아 DB 제약 조건 위반 발생 (`IntegrityError`).

## 해결 방법
### Immediate Fix
- `app/v2/services/admin_user_service.py`의 `purge_user` 메서드에 누락된 테이블(`UserSecretCodeClaim`, `UserSeoDailyCodeClaim`) 삭제 로직 추가.

### Long-term Fix
- 모든 연관 테이블에 올바른 `ON DELETE CASCADE` 설정 적용 및 마이그레이션 점검.
- `purge_user` 로직을 모델 메타데이터 기반으로 자동화하거나, 새 테이블 추가 시 `purge_user` 업데이트를 강제하는 프로세스 도입.

## 검증 방법
- 수정 후 어드민에서 유저 퍼지 재시도 → 204 No Content 성공 확인.
- DB에서 해당 유저 및 `user_seo_daily_code_claim` 레코드가 삭제되었는지 확인.

## 관련 문서 (SoT/learned)
- [Admin User Purge Fix Changelog](../SOT/00_admin/변경로그/20260212_admin_user_purge_fix.md)
