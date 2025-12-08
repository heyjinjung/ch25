# 관리자 회원 CRUD 가이드 (초간단)

## 무엇을 할 수 있나요?
- 회원 생성: external_id, 닉네임, 비밀번호, 레벨, 상태를 입력
- 회원 수정: 닉네임/레벨/상태/비밀번호 초기화
- 회원 삭제: 잘못 만든 계정 제거
- 시크릿 운영: 관리자만 계정 정보를 전달하고, 사용자는 받은 아이디/비번으로 로그인

## 사용하는 화면
- 경로: `/admin/users` (관리자 로그인 후 이동)
- 입력 필드
  - User ID: 숫자 직접 지정(옵션, 비우면 자동 증가)
  - External ID: 필수, 고유한 아이디(유니크)
  - 닉네임: 표시 이름
  - 레벨: 1 이상의 숫자
  - 상태: ACTIVE / INACTIVE / BANNED
  - 비밀번호: 새 계정 생성 시 설정, 기존 계정은 변경 시에만 입력
- 버튼
  - 생성: 새 행에서 필수값 입력 후 생성
  - 저장: 기존 행 수정 후 저장
  - 삭제: 행 삭제 및 DB 삭제

## 로그인 흐름 (사용자 입장)
1) 관리자에게 받은 external_id / 비밀번호(필요시 user_id) 입력
2) 프런트 `/login` 화면에서 입력 후 로그인
3) 백엔드 `/api/auth/token`에서 비밀번호 검증(저장된 해시가 있으면 필수)
4) 성공 시 JWT + 사용자 정보(id, external_id, nickname, level, status) 반환 → 홈으로 이동

## 백엔드 API 요약
- `POST /api/auth/token`
  - 요청: `{ user_id?, external_id?, password? }`
  - 동작: user_id 또는 external_id로 사용자 조회 → 비밀번호 해시가 있으면 검증, 없으면 최초 설정
  - 응답: `{ access_token, user: { id, external_id, nickname, level, status } }`
- 관리자 전용
  - `GET /admin/api/users` : 전체 목록
  - `POST /admin/api/users` : 사용자 생성
  - `PUT /admin/api/users/{id}` : 사용자 수정
  - `DELETE /admin/api/users/{id}` : 사용자 삭제

## DB/스키마
- `user` 테이블에 컬럼 추가
  - `nickname` (nullable)
  - `password_hash` (nullable, SHA256 해시)
  - `level` (int, default 1)
- Alembic: `20251208_0008_add_user_credentials_and_level.py`
- 시드 불필요(필요 시 관리자 화면에서 바로 생성)

## 보안 주의
- 비밀번호는 간단한 SHA256 해시로 저장(강력한 보안 목적이 아님). 운영 시 강한 해시/정책 필요.
- 비밀번호가 설정된 계정은 로그인 시 반드시 password를 제출해야 함.

## 빠른 체크리스트
- [ ] `alembic upgrade head` 적용
- [ ] 프런트 재빌드/재배포 후 `/admin/users` 메뉴 노출
- [ ] 새 계정 생성 → `/login`에서 external_id + 비밀번호로 로그인 성공 확인
- [ ] 수정/삭제 후 목록 재조회 시 반영 확인
