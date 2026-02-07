문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/OPS
상태: SoT

## 0. 요약
- 유저 식별은 v2_user.cc_id가 최우선이다.
- JIT Sync로 v2_user.id와 user.id를 1:1로 강제한다.
- 삭제/퍼지는 V2 어드민 경로를 사용한다.

## 1. 목적
유저 식별, 인증, 동기화, 삭제 정책을 단일 SoT로 정리한다.

## 2. 식별자 체계
### 2.1 Primary Key
- v2_user.id는 통합 ID이며 레거시 user.id와 동일해야 한다.

### 2.2 로그인 기준
- V2 인증 기준: v2_user.cc_id
- 레거시 external_id는 호환 목적이다.

### 2.3 텔레그램
- telegram_id는 숫자 TG ID이며 tgid: 프리픽스 검색을 권장한다.
- telegram_username은 보조 식별자로 사용한다.

## 3. 인증 경로
### 3.1 V2 인증
- /api/v2/auth/token
- /api/v2/telegram/auth

### 3.2 호환 경로
- V1 경로는 점진적 폐기 대상이다.

## 4. JIT 동기화
### 4.1 목적
- v2_user가 없는 경우 즉시 생성하여 로그인 실패를 방지한다.

### 4.2 규칙
- 레거시 user.id를 그대로 v2_user.id에 승계한다.
- 동일 ID 원칙은 예외 없이 지킨다.

### 4.3 기준 구현
- user_service.get_or_create_v2_user_from_legacy
- auth_service.issue_token 경로에 연동

## 5. 삭제/퍼지 정책
### 5.1 API 경로
- DELETE /api/v2/admin/users/{user_id}
- POST /api/v2/admin/users/{user_id}/purge

### 5.2 권한
- ADMIN 권한으로 삭제/퍼지 가능
- SUPER_ADMIN 강제는 폐기됨

### 5.3 삭제 범위
- delete: 기본 엔티티 제거 + 관계 정리
- purge: 유저 연관 데이터 전체 삭제

## 6. 로그인 실패/오류 기준
### 6.1 흔한 원인
- v2_user 미생성
- DB 환경 불일치
- 미션 로직 중복 생성

### 6.2 증거 기반 트리아지
- HTTP Status, 로그, 제약조건을 반드시 기록한다.

## 7. 보안/감사
- 인증 이벤트 로깅을 권장한다.
- 민감 정보(계좌, 실명)는 저장하지 않는다.

## 8. 인증 흐름 상세
### 8.1 토큰 발급
1) 사용자 식별
2) v2_user 조회 또는 JIT Sync
3) Access Token 발급

### 8.2 텔레그램 인증
- initData 해시 검증 후 V2User 생성
- telegram_id 기준 매칭
- nickname 자동 생성 규칙 적용

## 9. API 계약 요약
### 9.1 토큰 발급
POST /api/v2/auth/token

### 9.2 텔레그램 인증
POST /api/v2/telegram/auth

### 9.3 유저 삭제
DELETE /api/v2/admin/users/{user_id}

### 9.4 유저 퍼지
POST /api/v2/admin/users/{user_id}/purge

## 10. 응답 예시
### 10.1 로그인 성공
```json
{
	"access_token": "...",
	"user": {
		"id": 123,
		"cc_id": "cc001",
		"nickname": "level"
	}
}
```

### 10.2 로그인 실패
```json
{
	"detail": "LOGIN_FAILED"
}
```

## 11. 권한 정책
- ADMIN 권한은 유저 삭제/퍼지 허용
- SUPER_ADMIN 전용 제한은 폐기됨
- get_current_admin_info 기반 인증만 유지

## 12. 동기화 시나리오
### 12.1 정상
- user 존재, v2_user 존재
- 토큰 발급 후 정상 로그인

### 12.2 JIT Sync 필요
- user 존재, v2_user 없음
- v2_user 생성 후 토큰 발급

### 12.3 불일치
- v2_user.id != user.id
- 즉시 정합성 교정 필요

## 13. 오류/장애 사례 요약
- MissionService 중복 생성으로 LOGIN_FAILED 발생
- DB 환경 불일치로 IntegrityError 발생
- purge 시 V2User import 누락으로 NameError 발생

## 14. 인증 데이터 규칙
### 14.1 cc_id 규칙
- 대소문자 혼합 허용
- 공백 제거 후 저장

### 14.2 telegram_id 규칙
- 숫자형만 저장
- 검색 시 tgid: 프리픽스 사용

## 15. 보안 체크리스트
- initData 해시 검증 통과 여부
- 토큰 만료 시간 정책 준수 여부
- 로그에 민감정보 노출 여부

## 16. 운영 팁
- 로그인 실패 시 먼저 DB 환경을 확인한다.
- JIT Sync는 레거시 ID 승계를 반드시 보장한다.
- 삭제/퍼지는 되돌릴 수 없음을 UI에서 고지한다.

## 17. 감사 로그 기준
- action: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
- target_type: User
- before/after 데이터는 최소화

## 18. 테스트 케이스
- V2 토큰 발급 성공
- v2_user 미존재 시 JIT Sync 생성
- 삭제 API 204 반환
- 퍼지 API 204 반환
- ADMIN 권한으로 삭제 가능
- 로그인 실패 시 원인 로그 출력
- 텔레그램 인증 해시 실패 시 400 반환
- 텔레그램 신규 유저 생성 정상

## 19. 운영 예외 처리
- DB 환경 불일치 발견 시 즉시 중단
- 미션 중복 생성 감지 시 롤백
- 권한 오류는 403으로 명확히 반환

## 14. 운영 체크리스트
- v2_user 생성 여부 확인
- ID 불일치 점검
- 삭제/퍼지 권한 정상 동작 확인
- 텔레그램 인증 해시 검증 정상 여부 확인
- 인증 이벤트 로깅 정상 여부 확인

## 15. 참고 문서
- [유저 테이블 단일화 계획](아카이브/20260127_user_table_unification_plan.md)
- [V2 JIT 동기화 구현](아카이브/20260127_user_login_jit_sync_implementation.md)
- [삭제 API 경로 수정](아카이브/20260126_user_delete_api_path_fix.md)
- [어드민 로그인 IntegrityError](아카이브/20260127_admin_login_integrity_error_fix.md)

## 16. 변경 이력
- v1.0 (2026-02-07): 아카이브 통합 SoT 5문서 중 2권으로 작성
