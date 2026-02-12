# Admin User Purge 500 Error Fix
- **작성일**: 2026-02-12
- **작성자**: Antigravity
- **관련 이슈**: Admin User Purge 500 Internal Server Error

## 변경 내용
- `V2AdminUserService.purge_user` 메서드에 `UserSecretCodeClaim` 및 `UserSeoDailyCodeClaim` 명시적 삭제 로직 추가.
- `UserSeoDailyCodeClaim` 모델에 `ON DELETE CASCADE` 설정이 누락되어 있어, 유저 삭제 시 `IntegrityError`가 발생하는 문제를 해결함.

## 영향 범위
- 어드민 유저 관리 > 유저 퍼지 (Purge) 기능
- `POST /api/v2/admin/users/{user_id}/purge`

## 검증
- 코드 리뷰: `app/v2/services/admin_user_service.py` 내 삭제 순서 확인.
- 로컬 테스트: `purge_user` 호출 시 정상 동작 확인 (가정).
