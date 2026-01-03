# Admin User CRUD Guide
문서 타입: 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 관리자, 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 관리자 회원 CRUD 화면/백엔드 연동 절차와 보안 유의사항을 명확히 한다.

## 2. 범위 (Scope)
- `/admin/users` 화면, 관리자 전용 사용자 CRUD API, 사용자 로그인 플로우에 영향을 주는 필드만 다룬다.

## 3. 용어 정의 (Definitions)
- `external_id`: 사용자 로그인 시 사용하는 고유 ID(유니크).
- `admin_token`: 관리자 인증 토큰(선행 로그인 필요).

## 4. 지원 기능
- 생성: `external_id`, 닉네임, 비밀번호, 레벨, 상태 입력.
- 수정: 닉네임/레벨/상태/비밀번호 초기화.
- 삭제: 불필요 계정 삭제.
- 운영: 관리자만 계정 발급 후 아이디/비번 전달.

## 5. 화면/필드
- 경로: `/admin/users` (관리자 로그인 후 접근).
- 입력 필드
  - User ID: 수동 지정 옵션(비우면 자동 증가).
  - External ID: 필수, 고유 ID.
  - 닉네임: 표시 이름.
  - 레벨: 1 이상 숫자.
  - 상태: `ACTIVE` / `INACTIVE` / `BANNED`.
  - 비밀번호: 새 계정 시 설정, 기존은 변경 시에만 입력.
- 버튼
  - 생성: 새 행 필수값 입력 후 생성.
  - 저장: 기존 행 수정 후 저장.
  - 삭제: 행 삭제 및 DB 삭제.

## 6. 사용자 로그인 흐름
1) 사용자: 관리자에게 받은 `external_id`/비밀번호(필요 시 `user_id`) 입력.
2) 프런트: `/login`에서 입력 후 로그인.
3) 백엔드: `POST /api/auth/token`에서 비밀번호 검증(해시가 있으면 필수).
4) 성공 시 JWT + 사용자 정보(id, external_id, nickname, level, status) 반환 → 홈 이동.

## 7. 백엔드 API 요약
- `POST /api/auth/token`
  - 요청: `{ user_id?, external_id?, password? }`
  - 동작: user_id 또는 external_id 조회 → 비밀번호 해시가 있으면 검증, 없으면 최초 설정
  - 응답: `{ access_token, user: { id, external_id, nickname, level, status } }`
- 관리자 전용
  - `GET /admin/api/users`: 전체 목록
  - `GET /admin/api/users/resolve?identifier=...`: 식별자 → 단일 사용자 확정(200/404/409)
  - `POST /admin/api/users`: 사용자 생성
  - `PUT /admin/api/users/{id}`: 사용자 수정
  - `DELETE /admin/api/users/{id}`: 사용자 삭제

## 8. 사용자 식별자(Identifier) 입력 규칙(운영자용)

어드민에서 “사용자 선택”이 필요한 기능은 가능한 한 **단일 식별자 입력 → Resolve로 단일 사용자 확정(200/404/409) → 확정 후 작업** 흐름을 따른다.

### 8.1 지원 입력 형태(대표)
- `user_id` (숫자)
- `tg_id` (숫자)
- 텔레그램 유저네임: `@username` 또는 `username` (대소문자 무시)
- 닉네임: `nickname`
- `external_id`
- `tg_{id}_{suffix}` 형태의 external_id

### 8.2 에러 정책(중요)
- 200: 단일 사용자로 확정됨 → 이후 작업 진행
- 404: 해당 식별자로 사용자를 찾지 못함 → **입력을 바꿔 재시도**
- 409: **중복 매칭(모호성)** → 정책상 후보 선택 UI 없이 **차단**(재입력 유도)

### 8.3 운영 팁
- 텔레그램 유저네임은 `@`를 붙여도 되고 빼도 된다.
- 동일 닉네임/유사 입력으로 409가 뜨면, `user_id` 또는 `tg_id` 같이 더 강한 식별자로 재시도한다.

## 9. DB/스키마

## 8. DB/스키마
- `user` 테이블 컬럼
  - `nickname` (nullable)
  - `password_hash` (nullable, SHA256 해시)
  - `level` (int, default 1)
- Alembic: `20251208_0008_add_user_credentials_and_level.py`
- 시드: 불필요(관리자 화면에서 생성 가능).

## 10. 보안 주의
- 비밀번호는 SHA256 해시로 저장(강력한 보안 아님) → 운영 시 강한 해시/정책 필요.
- 비밀번호가 설정된 계정은 로그인 시 반드시 password 제출.

## 11. QA 체크리스트
- [ ] `alembic upgrade head` 적용.
- [ ] 프런트 재빌드/재배포 후 `/admin/users` 메뉴 노출.
- [ ] 새 계정 생성 → `/login`에서 external_id + 비밀번호로 로그인 성공.
- [ ] 수정/삭제 후 목록 재조회 시 반영 확인.

## 12. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 목적/범위/정의/QA 추가.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.
