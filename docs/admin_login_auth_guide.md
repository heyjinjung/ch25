# 관리자 로그인 및 인증 구현/운영 가이드

## 기능 요약
- 관리자 로그인 폼 구현 (react-hook-form + zod)
- 계정: 아이디 admin / 비밀번호 1234
- 로그인 성공 시 localStorage에 admin_token 저장
- 인증된 경우 /admin 대시보드 및 모든 관리자 기능 접근 가능
- 인증 미구현 시 로그인 폼만 노출

---

## 실제 코드 흐름
1. **로그인 폼**: src/admin/pages/AdminLoginPage.tsx
   - 아이디/비밀번호 입력 → 검증
   - 성공 시 setAdminToken("admin-session") 호출
   - 실패 시 에러 메시지 표시
2. **인증 체크**: src/components/routing/ProtectedRoute.tsx
   - isAdminAuthenticated()로 인증 여부 확인
   - 인증 없으면 /admin/login으로 리다이렉트
3. **인증 토큰 관리**: src/auth/adminAuth.ts
   - localStorage 기반 간단 토큰 관리
   - setAdminToken, getAdminToken, clearAdminToken, isAdminAuthenticated

---

## 운영/테스트 방법
1. 브라우저에서 /admin/login 진입
2. 아이디: admin, 비밀번호: 1234 입력 후 로그인
3. 성공 시 /admin 대시보드 및 모든 관리자 메뉴 접근 가능
4. 로그아웃(토큰 삭제) 필요 시 localStorage에서 admin_token 삭제

---

## 보안/운영 참고
- 현재는 localStorage 기반 단순 인증(테스트/개발용)
- 운영 환경에서는 JWT/세션 기반 인증, HTTPS, 관리자 계정 관리 필요
- 인증 미구현 시 누구나 /admin 접근 가능하므로, 운영 배포 전 반드시 강화 필요

---

## 코드 위치
- 로그인 폼: src/admin/pages/AdminLoginPage.tsx
- 인증 체크: src/components/routing/ProtectedRoute.tsx
- 토큰 관리: src/auth/adminAuth.ts

---

## 변경 이력
- 2025-12-08: 관리자 로그인 폼 및 인증 로직 구현, 문서화 완료
