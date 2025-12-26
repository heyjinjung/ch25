# Admin Login / Auth Flow Guide
문서 타입: 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 관리자, 프론트엔드/백엔드 개발자

## 1. 목적 (Purpose)
- 관리자 로그인·인증 흐름과 코드 위치, 운영/보안 체크를 일관되게 안내한다.

## 2. 범위 (Scope)
- 관리자 로그인 화면, 토큰 저장 방식(localStorage), 라우팅 보호, 운영 시 보강해야 할 인증 체계까지 포함한다.

## 3. 용어 정의 (Definitions)
- `admin_token`: 현 구현에서 localStorage에 저장하는 관리자 세션 토큰.
- Protected Route: 인증 없을 때 로그인 페이지로 리다이렉트하는 라우팅 가드.

## 4. 기능 요약
- 로그인 폼 구현(react-hook-form + zod).
- 계정: 아이디 `admin` / 비밀번호 `2wP?+!Etm8#Qv4Mn`.
- 성공 시 `localStorage.admin_token` 저장 후 관리자 메뉴 접근 가능.
- 인증 미구현 상태에서는 로그인 폼만 노출.

## 5. 코드 흐름
1) 로그인 폼: `src/admin/pages/AdminLoginPage.tsx`
   - 아이디/비밀번호 입력·검증 → 성공 시 `setAdminToken("admin-session")` 호출.
2) 인증 체크: `src/components/routing/ProtectedRoute.tsx`
   - `isAdminAuthenticated()`로 확인, 없으면 `/admin/login` 리다이렉트.
3) 토큰 관리: `src/auth/adminAuth.ts`
   - localStorage 기반 `setAdminToken`, `getAdminToken`, `clearAdminToken`, `isAdminAuthenticated` 제공.

## 6. 운영/테스트 방법
1) `/admin/login` 진입 → 관리자 계정 입력 후 로그인.
2) 성공 시 `/admin` 대시보드 및 모든 관리자 메뉴 접근 확인.
3) 로그아웃 필요 시 localStorage의 `admin_token` 삭제.

## 7. 보안/운영 참고
- 현 구조는 localStorage 기반 단순 토큰(테스트/개발용)으로, 운영 전 JWT/세션 + HTTPS + 관리자 계정 관리로 교체 필요.
- `/admin` 노출 방지를 위해 배포 전 인증 강화 필수.
- XSS 방지 헤더(CSP)와 토큰 보관 위치 점검을 권장.

## 8. 코드 위치 요약
- 로그인 폼: `src/admin/pages/AdminLoginPage.tsx`
- 인증 체크: `src/components/routing/ProtectedRoute.tsx`
- 토큰 관리: `src/auth/adminAuth.ts`

## 9. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 목적/범위/보안 참고 보강.
- v1.0 (2025-12-08, 시스템 설계팀): 관리자 로그인 폼 및 인증 로직 구현, 문서화.
